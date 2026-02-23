import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import Web3 from "web3";
import { setupHooks } from "./hooks/setupHooks";
import { loadContract } from "../../../utils/loadContract";
import { useAccounts } from "@midl/react";
import {
  useEVMAddress,
  useAddTxIntention,
  useFinalizeBTCTransaction,
  useSignIntention,
  useSendBTCTransactions,
} from "@midl/executor-react";
import { useWaitForTransaction } from "@midl/react";
import { usePublicClient } from "wagmi";

const Web3Context = createContext(null);

const setListeners = (provider) => {
  provider.on("chainChanged", (_) => window.location.reload());
};

export default function Web3Provider({ children }) {
  const { isConnected, accounts } = useAccounts();
  const btcAddress = accounts?.[0]?.address || null;
  const evmAddress = useEVMAddress({ from: btcAddress });

  // MIDL Transaction Hooks (following the official WriteContract example)
  const { addTxIntention, addTxIntentionAsync, txIntentions } = useAddTxIntention();
  const { finalizeBTCTransaction, finalizeBTCTransactionAsync, data: finalizedData } = useFinalizeBTCTransaction();
  const { signIntentionAsync } = useSignIntention();
  const { sendBTCTransactionsAsync } = useSendBTCTransactions();
  const publicClient = usePublicClient();
  const { waitForTransactionAsync } = useWaitForTransaction();

  const [web3Api, setWeb3Api] = useState(() => ({
    web3: null,
    provider: null,
    contract: null,
    isLoading: true,
    hooks: setupHooks({ web3: null, provider: null, contract: null, connectedAccount: null }),
  }));

  const [connectedAccountState, setConnectedAccountState] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadProvider = async () => {
      if (!mounted) return;

      const absoluteRpc = 'https://rpc.staging.midl.xyz';
      const web3 = new Web3(new Web3.providers.HttpProvider(absoluteRpc));
      const contract = await loadContract("LendingAndBorrowing", web3);

      if (!mounted) return;

      const metamaskProvider = await detectEthereumProvider();

      if (metamaskProvider) {
        setWeb3Api({
          web3,
          provider: metamaskProvider,
          contract,
          isLoading: false,
          hooks: null,
        });
        setListeners(metamaskProvider);
      } else {
        setWeb3Api({
          web3,
          provider: null,
          contract,
          isLoading: false,
          hooks: null,
        });
      }
    };

    loadProvider();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (evmAddress && evmAddress !== connectedAccountState) {
      setConnectedAccountState(evmAddress);
    } else if (!evmAddress && connectedAccountState) {
      setConnectedAccountState(null);
    }
  }, [evmAddress, connectedAccountState]);

  const _web3Api = useMemo(() => {
    const { web3, provider, isLoading, contract } = web3Api;
    const connectedAccount = connectedAccountState;
    const isUniversal = true; // Midl is inherently universal

    const hooks = setupHooks({ web3, provider, contract, connectedAccount });

    return {
      web3,
      provider,
      contract,
      isLoading,
      hooks,
      connectedAccount,
      btcAddress,
      isUniversal,
      chainId: 15001, // Midl Regtest
      requireInstall: false,
      connect: () => { }, // Wallet connect handled by SatoshiKit ConnectButton
    };
  }, [
    web3Api,
    web3Api.web3,
    web3Api.contract,
    connectedAccountState,
    btcAddress
  ]);

  // Store refs so the useCallback doesn't go stale
  const addTxIntentionAsyncRef = useRef(addTxIntentionAsync);
  const finalizeBTCTransactionAsyncRef = useRef(finalizeBTCTransactionAsync);
  const signIntentionAsyncRef = useRef(signIntentionAsync);
  const publicClientRef = useRef(publicClient);
  const waitForTransactionAsyncRef = useRef(waitForTransactionAsync);
  const btcAddrRef = useRef(btcAddress);

  useEffect(() => { addTxIntentionAsyncRef.current = addTxIntentionAsync; }, [addTxIntentionAsync]);
  useEffect(() => { finalizeBTCTransactionAsyncRef.current = finalizeBTCTransactionAsync; }, [finalizeBTCTransactionAsync]);
  useEffect(() => { signIntentionAsyncRef.current = signIntentionAsync; }, [signIntentionAsync]);
  useEffect(() => { publicClientRef.current = publicClient; }, [publicClient]);
  useEffect(() => { waitForTransactionAsyncRef.current = waitForTransactionAsync; }, [waitForTransactionAsync]);
  useEffect(() => { btcAddrRef.current = btcAddress; }, [btcAddress]);

  // Real MIDL transaction sender — follows the official WriteContract example
  // Flow: addTxIntention → finalizeBTCTransaction → signIntention → broadcast
  const sendTransaction = useCallback(async (method, fromAddress) => {
    // 1. Encode the web3 method call into ABI calldata
    const data = method.encodeABI();
    const to = method._parent.options.address; // contract address

    console.log('[MIDL TX] Step 1: Adding transaction intention...', { to, data: data.substring(0, 10) + '...' });

    // Step 1: Add the EVM transaction intention — use Async to get the returned intention
    const createdIntention = await addTxIntentionAsyncRef.current({
      reset: true,
      intention: {
        evmTransaction: {
          to,
          data,
        },
      },
      from: btcAddrRef.current,
    });

    console.log('[MIDL TX] Step 2: Finalizing BTC transaction...');

    // Step 2: Finalize the BTC transaction (estimates gas, creates BTC tx)
    const finalized = await finalizeBTCTransactionAsyncRef.current({
      from: btcAddrRef.current,
    });

    console.log('[MIDL TX] Step 3: Signing transaction intention...');

    // Step 3: Sign the intention — signIntentionAsync returns the signed serialized tx hex
    const signedSerializedTx = await signIntentionAsyncRef.current({
      intention: createdIntention,
      txId: finalized.tx.id,
    });

    console.log('[MIDL TX] Step 4: Broadcasting transactions...', { signedSerializedTx: signedSerializedTx?.substring?.(0, 20) + '...' });

    // Step 4: Broadcast the signed transactions
    const client = publicClientRef.current;
    if (!client) throw new Error('Wagmi public client not available');

    const result = await client.sendBTCTransactions({
      serializedTransactions: [signedSerializedTx],
      btcTransaction: finalized.tx.hex,
    });

    // Wait for on-chain confirmation (critical for approve → lend flow)
    console.log('[MIDL TX] Step 5: Waiting for on-chain confirmation...');
    try {
      const waitPromise = waitForTransactionAsyncRef.current({ txId: finalized.tx.id });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 10000)
      );

      await Promise.race([waitPromise, timeoutPromise]);
    } catch (e) {
      console.warn('[MIDL TX] Confirmation wait ended with:', e.message);
      // Don't throw. The transaction was broadcasted, just confirmation is slow.
    }

    console.log('[MIDL TX] Transaction broadcast complete:', result);

    // Structure the result so UI modals can read the transactionHash
    const txHash = Array.isArray(result) ? result[0] : (result?.transactionHash || result);
    return { ...result, transactionHash: txHash, rawResult: result };
  }, []);

  const memoizedContextValue = useMemo(() => {
    return {
      ..._web3Api,
      sendTransaction,
    };
  }, [_web3Api, sendTransaction]);

  return (
    <Web3Context.Provider value={memoizedContextValue}>{children}</Web3Context.Provider>
  );
}

export function useWeb3() {
  return useContext(Web3Context);
}

export function useHooks(callback) {
  const { hooks } = useWeb3();
  return callback(hooks);
}

