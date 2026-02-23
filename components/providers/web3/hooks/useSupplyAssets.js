import useSWR from "swr";
import { normalizeToken } from "../../../../utils/normalize";
import Web3 from 'web3';

// Set to false for better performance
const DEBUG_MODE = false;

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
    `web3/supply_assets/${web3 && contract ? (connectedAccount || 'no-account') : 'loading'}`,
    async () => {
      // Don't fetch if web3/contract not ready
      if (!web3 || !contract) {
        return null;
      }

      try {
        // 🛡️ CREATE PROXY WEB3 FOR SAFE READ OPERATIONS
        // 1. Market Data (Global, Bulk, Cached) - Tolerates some lag (Private RPC)
        const marketWeb3 = new Web3(new Web3.providers.HttpProvider('https://rpc.staging.midl.xyz'));

        // 2. User Data (Balances, Interactive) - Needs freshness (Public RPC)
        const userWeb3 = marketWeb3; // Reuse for Regtest

        const supplyAssets = []

        // Start immediately - no delay

        const tokens = await contract.methods.getTokensForLendingArray().call()

        // 🚀 BALANCED LOADING - Process 3 tokens at a time
        const filteredTokens = tokens;

        const BATCH_SIZE = 15;
        const results = [];

        for (let i = 0; i < filteredTokens.length; i += BATCH_SIZE) {
          const batch = filteredTokens.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (currentToken) => {
              try {
                // Pass BOTH providers to normalizeToken
                return await normalizeToken(web3, contract, currentToken, connectedAccount, marketWeb3, userWeb3);
              } catch (e) {
                // console.error(`DEBUG: Failed to normalize token ${currentToken.tokenAddress || currentToken[0]}:`, e);
                return null;
              }
            })
          );
          results.push(...batchResults.filter(r => r !== null));
        }

        supplyAssets.push(...results);

        return supplyAssets
      } catch (error) {
        throw error;
      }
    },
    {
      refreshInterval: 0, // Disable auto-refresh (only manual refresh)
      revalidateOnFocus: false, // Don't refresh on focus
      revalidateOnReconnect: false, // Don't refresh on reconnect
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
    // Midl is generic, isSupported checks can be improved
    isSupported: true,
  };
};

/**

web3.eth.net.getId() will return the network id on ganache itself
web3.eth.getChainId() will return the chainId of ganache in metamask.

chainChanged event listens with web3.eth.getChainId()


 */
