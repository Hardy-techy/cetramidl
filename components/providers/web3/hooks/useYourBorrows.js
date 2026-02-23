import useSWR from "swr";
import { normalizeToken } from "../../../../utils/normalize";
import Web3 from 'web3';

const NETWORKS = {
  1: "Ethereum Main Network",
  3: "Ropsten Test Network",
  4: "Rinkeby Test Network",
  5: "Goerli Test Network",
  42: "Kovan Test Network",
  11155111: "Sepolia Test Network",
  56: "Binance Smart Chain",
  1337: "Ganache",
  15001: "Midl Regtest",
};


export const handler = (web3, contract, connectedAccount) => () => {
  // connectedAccount is passed as a parameter from setupHooks

  const { data, error, mutate, isValidating, ...rest } = useSWR(
    // ALWAYS return a key, even if web3 is null - this ensures the hook is ready
    `web3/your_borrows/${web3 && contract ? (connectedAccount || 'no-account') : 'loading'}`,
    async () => {
      // Don't fetch if web3/contract not ready
      if (!web3 || !contract) {
        return null;
      }

      const account = connectedAccount;

      const yourBorrows = [];
      let yourBalance = 0;

      try {
        // 1. Market Data (Global, Bulk, Cached)
        const marketWeb3 = new Web3(new Web3.providers.HttpProvider('https://rpc.staging.midl.xyz'));

        // 2. User Data (Balances, Interactive)
        const userWeb3 = marketWeb3;

        // Start immediately

        const tokens = await contract.methods.getTokensForBorrowingArray().call()

        // 🚀 BALANCED LOADING - Process 3 tokens at a time
        const filteredTokens = tokens;

        const BATCH_SIZE = 3;
        const results = [];

        for (let i = 0; i < filteredTokens.length; i += BATCH_SIZE) {
          const batch = filteredTokens.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (currentToken) => {
              try {
                return await normalizeToken(web3, contract, currentToken, connectedAccount, marketWeb3, userWeb3);
              } catch (e) {
                return null;
              }
            })
          );

          batchResults.forEach(normalized => {
            if (normalized && parseFloat(normalized.userTokenBorrowedAmount.amount) > 0) {
              yourBorrows.push(normalized);
              yourBalance += parseFloat(normalized.userTokenBorrowedAmount.inDollars);
            }
          });
        }

        return { yourBorrows, yourBalance };
      } catch (error) {
        throw error;
      }
    },
    {
      refreshInterval: 0, // Disable auto-refresh (only manual refresh)
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 0, // Allow immediate refresh after transactions
      keepPreviousData: true, // Keep data visible during refresh for smooth UX
    }
  );

  const targetNetwork = NETWORKS["15001"];


  return {
    data,
    error,
    mutate, // Expose mutate for manual refresh
    isValidating,
    ...rest,
    target: targetNetwork,
    isSupported: true,
  };
};

/**

web3.eth.net.getId() will return the network id on ganache itself
web3.eth.getChainId() will return the chainId of ganache in metamask.

chainChanged event listens with web3.eth.getChainId()


 */
