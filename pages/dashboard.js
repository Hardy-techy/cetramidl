import Head from 'next/head';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSWRConfig, mutate } from 'swr';
import { useWeb3 } from '../components/providers/web3';
import Web3 from 'web3';
import {
  useAccount,
  useBorrowAssets,
  useSupplyAssets,
  useYourBorrows,
  useYourSupplies,
} from '../components/hooks/web3';
import ModernNavbar from '../components/ui/ModernNavbar';
import SupplyModal from '../components/ui/SupplyModal';
import BorrowModal from '../components/ui/BorrowModal';
import WithdrawModal from '../components/ui/WithdrawModal';
import RepayModal from '../components/ui/RepayModal';
import TableSkeleton from '../components/ui/TableSkeleton';
import MockTokens from '../abis/MockTokens.json';
import { trackPromise } from 'react-promise-tracker';

export default function Markets() {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig(); // Global SWR cache control
  const { requireInstall, isLoading, connect, contract, web3, isUniversal, chainId, connectedAccount, pushChainContext, sendTransaction: providerSendTransaction } = useWeb3();
  const { account } = useAccount();
  const user = account?.data;
  const { tokens, mutate: refreshSupplyAssets, isValidating: isLoadingSupply } = useSupplyAssets();
  const { tokensForBorrow, mutate: refreshBorrowAssets, isValidating: isLoadingBorrow } = useBorrowAssets();
  const { yourSupplies, mutate: refreshYourSupplies, isValidating: isLoadingYourSupplies } = useYourSupplies();
  const { yourBorrows, mutate: refreshYourBorrows, isValidating: isLoadingYourBorrows } = useYourBorrows();

  // Market page - no redirect needed

  // Check if any data is being refreshed
  const isRefreshing = isLoadingSupply || isLoadingBorrow || isLoadingYourSupplies || isLoadingYourBorrows;

  const [refreshKey, setRefreshKey] = useState(0); // Force re-render counter
  const [selectedToken, setSelectedToken] = useState(null);
  const [modalType, setModalType] = useState(null); // 'supply', 'withdraw', 'borrow', 'repay'
  const [showYourSupplies, setShowYourSupplies] = useState(true);
  const [showYourBorrows, setShowYourBorrows] = useState(true);
  const [showAssetsToSupply, setShowAssetsToSupply] = useState(true);
  const [showAssetsToBorrow, setShowAssetsToBorrow] = useState(true);

  const [txResult, setTxResult] = useState(null);
  const [txError, setTxError] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0); // Force remount counter
  const [activeTab, setActiveTab] = useState('supply'); // 'supply' or 'borrow'

  const toTokenUnits = (amount, decimals) => {
    if (!amount) return '0';
    // Default to 18 decimals if undefined
    const dec = decimals || 18;

    // Check if web3 is available for utils
    if (!web3) return amount.toString(); // Should not happen if connected

    // Handle scientific notation or simple string
    let amtStr = amount.toString();

    // Split decimals
    const parts = amtStr.split('.');
    let whole = parts[0];
    let frac = parts[1] || "";

    if (frac.length > dec) {
      frac = frac.substring(0, dec);
    }
    while (frac.length < dec) {
      frac += "0";
    }

    // Combine and remove leading zeros
    let res = whole + frac;
    while (res.length > 1 && res.charAt(0) === '0') {
      res = res.substring(1);
    }
    return res;
  };

  // FORCE COMPONENT REMOUNT when web3 becomes ready
  useEffect(() => {
    if (web3 && contract && !isLoading && forceUpdate === 0) {
      setTimeout(() => {
        setForceUpdate(1); // Trigger re-render which will remount hooks with web3 ready
      }, 200);
    }
  }, [web3, contract, isLoading, forceUpdate]);



  // Function to refresh all data - Properly trigger SWR revalidation
  // Create a dedicated Read-Only Web3 instance that ALWAYS uses our reliable proxy
  // This bypasses the user's wallet (MetaMask/Push) which might be rate-limited
  const proxyWeb3 = useMemo(() => {
    return new Web3(new Web3.providers.HttpProvider('/api/rpc'));
  }, []);

  // Function to refresh all data - Properly trigger SWR revalidation
  const refreshAllData = async (priority = null) => {
    // 🚀 INSTANT REFRESH - Clear cache immediately for fresh data
    const { clearDynamicCache } = await import('../utils/rpcCache');
    clearDynamicCache();

    // Close modal first for a cleaner experience
    setModalType(null);
    setSelectedToken(null);
    setTxResult(null);
    setTxError(null);

    // FORCE refresh all data - Call mutate() to trigger revalidation
    try {
      // Global SWR revalidation
      await mutate(() => true, undefined, { revalidate: true });

      const wait = () => new Promise(r => setTimeout(r, 200));

      // Explicitly call hook mutators to ensure update
      if (priority === 'borrow') {
        console.log('Refreshing: Priority BORROW');
        await refreshYourBorrows(); // From hook

        // Background updates
        (async () => {
          await wait(); await refreshBorrowAssets();
          await wait(); await refreshYourSupplies();
          await wait(); await refreshSupplyAssets();
        })();
      } else if (priority === 'supply') {
        console.log('Refreshing: Priority SUPPLY');
        await refreshYourSupplies(); // From hook

        // Background updates
        (async () => {
          await wait(); await refreshSupplyAssets();
          await wait(); await refreshYourBorrows();
          await wait(); await refreshBorrowAssets();
        })();
      } else {
        // Default sequential
        await refreshYourSupplies(); await wait(); await refreshYourBorrows(); await wait();
        await refreshSupplyAssets(); await wait(); await refreshBorrowAssets();
      }
    } catch (error) {
      console.error("Refresh logic failed:", error);
    }
  };

  // Send transaction helper - using centralized provider logic
  const sendTransaction = async (method, fromAddress) => {
    return await providerSendTransaction(method, fromAddress);
  };

  const handleSupply = async (token, value) => {
    const fromAddress = connectedAccount || account.data;
    if (!fromAddress) throw new Error("No wallet connected");

    try {
      console.log('Starting supply for token:', token.tokenSymbol, 'amount:', value);

      const tokenInst = new proxyWeb3.eth.Contract(MockTokens.abi || MockTokens, token.tokenAddress);

      // Check wallet balance first
      const valueInWei = toTokenUnits(value, token.decimals);

      const walletBalance = await tokenInst.methods.balanceOf(fromAddress).call();

      const walletBalanceBN = web3.utils.toBN(walletBalance);
      const valueInWeiBN = web3.utils.toBN(valueInWei);

      if (walletBalanceBN.lt(valueInWeiBN)) {
        const amountNeeded = web3.utils.fromWei(valueInWei); // This error msg might be slightly off if decimals != 18 but OK for now
        const amountHave = web3.utils.fromWei(walletBalance.toString());

        throw new Error(
          `Insufficient ${token.tokenSymbol} balance.`
        );
      }

      // Check Allowance (Infinite Approval Logic)
      const allowance = await tokenInst.methods.allowance(fromAddress, contract.options.address).call();

      const allowanceBN = web3.utils.toBN(allowance);
      const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

      if (allowanceBN.lt(valueInWeiBN)) {
        console.log('Allowance insufficient, approving Infinite...');
        await trackPromise(
          sendTransaction(
            tokenInst.methods.approve(contract.options.address, MAX_UINT256),
            fromAddress
          )
        );
        console.log('Approval successful');
      } else {
        console.log('Sufficient allowance, skipping approval.');
      }

      console.log('Approval successful, lending...');

      // Lend
      const result = await trackPromise(
        sendTransaction(
          contract.methods.lend(token.tokenAddress, valueInWei),
          fromAddress
        )
      );

      console.log('Supply successful:', result);
      setTxResult(result);

      // FORCE CLEAR CACHE IMMEDIATELY
      const { clearDynamicCache } = await import('../utils/rpcCache');
      clearDynamicCache();

      // Aggressive Refresh
      await refreshAllData('supply');

      // Double check after 2 seconds for RPC propagation
      setTimeout(() => refreshAllData('supply'), 2000);
      setTimeout(() => refreshAllData('supply'), 5000);
    } catch (err) {
      console.error('Supply error:', err);
      setTxError(err);
    }
  };

  const handleBorrow = async (token, value) => {
    const fromAddress = connectedAccount || account.data;
    if (!fromAddress) throw new Error("No wallet connected");

    try {
      console.log('Starting borrow for token:', token.tokenSymbol, 'amount:', value);

      const result = await trackPromise(
        sendTransaction(
          contract.methods.borrow(toTokenUnits(value, token.decimals), token.tokenAddress),
          fromAddress
        )
      );

      console.log('Borrow successful:', result);
      setTxResult(result);

      // FORCE CLEAR CACHE IMMEDIATELY
      const { clearDynamicCache } = await import('../utils/rpcCache');
      clearDynamicCache();

      // Aggressive Refresh
      await refreshAllData('borrow');

      // Double check after 2 seconds for RPC propagation
      setTimeout(() => refreshAllData('borrow'), 2000);
      setTimeout(() => refreshAllData('borrow'), 5000);
    } catch (err) {
      console.error('Borrow error:', err);
      setTxError(err);
    }
  };

  const handleWithdraw = async (token, value) => {
    const fromAddress = connectedAccount || account.data;
    if (!fromAddress) throw new Error("No wallet connected");

    try {
      console.log('Starting withdraw for token:', token.tokenSymbol, 'amount:', value);

      const amountInUnits = toTokenUnits(value, token.decimals);

      // Check if user has enough supplied
      const suppliedAmount = parseFloat(token.userTokenLentAmount.amount);
      if (parseFloat(value) > suppliedAmount) {
        throw new Error(
          `Cannot withdraw more than supplied. You supplied ${suppliedAmount.toFixed(4)} ${token.tokenSymbol} but trying to withdraw ${value} ${token.tokenSymbol}.`
        );
      }

      // Fetch fresh liquidity data and physical balance
      let tokenInst;
      try {
        const rawAbi = MockTokens.default?.abi || MockTokens.abi || MockTokens;


        if (!Array.isArray(rawAbi)) {
          throw new Error(`Invalid ABI format: ${typeof rawAbi}`);
        }
        tokenInst = new proxyWeb3.eth.Contract(rawAbi, token.tokenAddress);
      } catch (abiError) {
        console.error('ABI Load Error:', abiError);
        throw new Error('System Error: Failed to load token properties. Please refresh.');
      }

      // DEBUG: Verify contract object

      const contractAddress = contract.options?.address || contract._address;

      if (!contractAddress) throw new Error("Contract address is missing!");

      // 1. Total Supplied
      const totalSupplied = await contract.methods.getTotalTokenSupplied(token.tokenAddress).call();

      // 2. Total Borrowed
      const totalBorrowed = await contract.methods.getTotalTokenBorrowed(token.tokenAddress).call();

      // 3. Physical Balance
      const contractRealBalance = await tokenInst.methods.balanceOf(contractAddress).call();

      // 4. User Available Dollars
      const userAvailableDollars = await contract.methods.getTokenAvailableToWithdraw(fromAddress).call();

      // 5. Withdrawal Value in Dollars
      let withdrawValueInDollars = '0';
      try {
        // Explicitly format arguments
        const safeAmount = amountInUnits.toString();
        const safeAddress = web3.utils.toChecksumAddress(token.tokenAddress);
        withdrawValueInDollars = await contract.methods.getAmountInDollars(safeAmount, safeAddress).call();
      } catch (err) {
        console.warn('getAmountInDollars failed:', err);
      }
      // 6. User Actual Token Balance (Contract State)
      const userTokenBalance = await contract.methods.tokensLentAmount(token.tokenAddress, fromAddress).call();

      const availableLiquidity = web3.utils.toBN(totalSupplied).sub(web3.utils.toBN(totalBorrowed));



      if (web3.utils.toBN(amountInUnits).gt(web3.utils.toBN(userTokenBalance))) {
        alert(`Balance Logic Error: You are trying to withdraw ${value} ${token.tokenSymbol}, but the contract thinks you only have ${web3.utils.fromWei(userTokenBalance)} supplied.`);
        throw new Error(`Balance Logic Error: Contract shows supply balance of ${web3.utils.fromWei(userTokenBalance)} but you requested ${value}.`);
      }

      if (web3.utils.toBN(amountInUnits).gt(availableLiquidity)) {
        alert(`Insufficient pool liquidity. Pool has ${web3.utils.fromWei(availableLiquidity)} ${token.tokenSymbol} available, but you requested ${value}.`);
        throw new Error(`Insufficient pool liquidity. Pool has ${web3.utils.fromWei(availableLiquidity)} ${token.tokenSymbol} available, but you requested ${value}.`);
      }

      if (web3.utils.toBN(withdrawValueInDollars).gt(web3.utils.toBN(userAvailableDollars))) {
        const maxUsd = web3.utils.fromWei(userAvailableDollars);
        const reqUsd = web3.utils.fromWei(withdrawValueInDollars);
        alert(`Health Factor Error: You can only withdraw $${maxUsd} worth of collateral, but you requested $${reqUsd}.`);
        throw new Error(`Health Factor Error: You can only withdraw $${maxUsd} worth of collateral, but you requested $${reqUsd}.`);
      }

      if (web3.utils.toBN(amountInUnits).gt(web3.utils.toBN(contractRealBalance))) {
        alert(`CRITICAL: Insolvent Pool. Contract physically holds only ${web3.utils.fromWei(contractRealBalance)} ${token.tokenSymbol}.`);
        throw new Error(`CRITICAL: Insolvent Pool. Contract physically holds only ${web3.utils.fromWei(contractRealBalance)} ${token.tokenSymbol}.`);
      }

      // CRITICAL: Approve LAR token transfer
      // The contract requires LAR tokens to be returned when withdrawing
      const LAR_TOKEN_ADDRESS = '0x5c08a9fad08c12E6C177783B28D0c7f3e88C3722';
      const larTokenInst = new proxyWeb3.eth.Contract(MockTokens.abi || MockTokens, LAR_TOKEN_ADDRESS);

      const larTokenToRemove = withdrawValueInDollars; // Amount in dollars (18 decimals)
      const currentLarAllowance = await larTokenInst.methods.allowance(fromAddress, contractAddress).call();



      if (web3.utils.toBN(currentLarAllowance).lt(web3.utils.toBN(larTokenToRemove))) {

        const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
        const larApprovalTx = larTokenInst.methods.approve(
          contractAddress,
          MAX_UINT256
        );

        await trackPromise(sendTransaction(larApprovalTx, fromAddress));

      }

      // SIMULATION: Try to execute the call locally first to catch the specific Revert Reason
      try {
        const safeTokenAddr = web3.utils.toChecksumAddress(token.tokenAddress);
        const safeAmount = amountInUnits.toString();

        await contract.methods.withdraw(safeTokenAddr, safeAmount).call({ from: fromAddress });

      } catch (simError) {


        // Sometimes the error object, message, or data contains the string
        alert(`Withdrawal Simulation Failed: ${simError.message || simError}`);
        throw simError; // Stop here, don't waste gas/spam network
      }

      const result = await trackPromise(
        sendTransaction(
          contract.methods.withdraw(web3.utils.toChecksumAddress(token.tokenAddress), amountInUnits.toString()),
          fromAddress
        )
      );

      console.log('Withdraw successful:', result);
      setTxResult(result);

      // FORCE CLEAR CACHE IMMEDIATELY
      const { clearDynamicCache } = await import('../utils/rpcCache');
      clearDynamicCache();

      // Aggressive Refresh
      await refreshAllData('supply');

      // Double check after 2 seconds for RPC propagation
      setTimeout(() => refreshAllData('supply'), 2000);
      setTimeout(() => refreshAllData('supply'), 5000);
    } catch (err) {
      console.error('Withdraw error:', err);
      setTxError(err);
    }
  };

  const handleRepay = async (token, value) => {
    const fromAddress = connectedAccount || account.data;
    if (!fromAddress) throw new Error("No wallet connected");

    try {
      console.log('Starting repay for token:', token.tokenSymbol, 'amount:', value);

      const tokenInst = new proxyWeb3.eth.Contract(MockTokens.abi || MockTokens, token.tokenAddress);

      // Calculate interest: borrowAPYRate is like 0.05 for 5%
      const valueInWei = toTokenUnits(value, token.decimals);

      // Interest calculation logic is tricky with variable decimals if factor is hardcoded.
      // contract side handles interest internal accumulation.
      // Front-end just needs to make sure we send enough to cover "payDebt".
      // But payDebt takes "amount" which is principal + interest? No, typically payDebt(token, amount) pays `amount`.
      // The logic below calculates interest manually to check balance.
      // Assuming borrowAPYRate is correct.

      const interestInWei = web3.utils.toBN(valueInWei).mul(web3.utils.toBN(Math.floor(parseFloat(token.borrowAPYRate) * 1000000))).div(web3.utils.toBN(1000000));
      const amountToPayBackInWei = web3.utils.toBN(valueInWei).add(interestInWei);

      // Check wallet balance (Use cached raw balance if available to avoid RPC rate limit)
      let walletBalance;
      if (token.walletBalance && token.walletBalance.raw) {
        walletBalance = token.walletBalance.raw;
      } else {
        // Fallback only if missing (should not happen after normalize update)
        walletBalance = await tokenInst.methods.balanceOf(fromAddress).call();
      }

      const walletBalanceBN = web3.utils.toBN(walletBalance);

      console.log('Repay details:', {
        value: value,
        valueInWei: valueInWei,
        borrowAPYRate: token.borrowAPYRate,
        interestInWei: interestInWei.toString(),
        amountToPayBackInWei: amountToPayBackInWei.toString(),
        walletBalance: walletBalance.toString(),
        hasEnoughBalance: walletBalanceBN.gte(amountToPayBackInWei),
        tokenAddress: token.tokenAddress
      });

      // Check if user has enough balance (including interest)
      if (walletBalanceBN.lt(amountToPayBackInWei)) {
        // Simplified error message
        throw new Error(
          `Insufficient ${token.tokenSymbol} balance to repay principal + interest.`
        );
      }

      // Check if user is trying to repay more than borrowed
      const borrowedAmount = web3.utils.toBN(toTokenUnits(token.userTokenBorrowedAmount.amount, token.decimals));
      if (web3.utils.toBN(valueInWei).gt(borrowedAmount)) {
        throw new Error(
          `Cannot repay more than borrowed. You borrowed ${parseFloat(token.userTokenBorrowedAmount.amount).toFixed(4)} ${token.tokenSymbol} but trying to repay ${value} ${token.tokenSymbol}.`
        );
      }

      // Check Allowance (Infinite Approval Logic)
      const allowance = await tokenInst.methods.allowance(fromAddress, contract.options.address).call();
      const allowanceBN = web3.utils.toBN(allowance);
      const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

      if (allowanceBN.lt(amountToPayBackInWei)) {
        console.log('Allowance insufficient, approving Infinite...');
        await trackPromise(
          sendTransaction(
            tokenInst.methods.approve(contract.options.address, MAX_UINT256),
            fromAddress
          )
        );
        console.log('Approval successful');
      } else {
        console.log('Sufficient allowance, skipping approval.');
      }

      console.log('Approval successful, paying debt...');

      // Pay debt - contract expects just the principal amount? Or total? 
      // Usually payDebt(token, amount) -> pays `amount`. If logic above adds interest, maybe we approve more but call payDebt with principal?
      // Original code: contract.methods.payDebt(token.tokenAddress, valueInWei)
      // So it calls payDebt with the input value (ValueInWei).
      // But it approves `amountToPayBackInWei`. This seems to imply the contract PULLS the interest? 
      // If payDebt only takes `amount` (principal), then the contract calculates interest and pulls `amount + interest`.
      // So yes, we approve `amount + interest` but call payDebt with `amount`.

      const result = await trackPromise(
        sendTransaction(
          contract.methods.payDebt(token.tokenAddress, valueInWei),
          fromAddress
        )
      );

      console.log('Repay successful:', result);
      setTxResult(result);

      // FORCE CLEAR CACHE IMMEDIATELY
      const { clearDynamicCache } = await import('../utils/rpcCache');
      clearDynamicCache();

      // Aggressive Refresh
      await refreshAllData('borrow');

      // Double check after 2 seconds for RPC propagation
      setTimeout(() => refreshAllData('borrow'), 2000);
      setTimeout(() => refreshAllData('borrow'), 5000);
    } catch (err) {
      console.error('Repay error:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        data: err.data
      });
      setTxError(err);
    }
  };

  const openModal = (type, token) => {
    setModalType(type);
    setSelectedToken(token);
    setTxResult(null);
    setTxError(null);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedToken(null);
    setTxResult(null);
    setTxError(null);
  };

  // Calculate totals
  const totalSupplied = yourSupplies.data?.yourBalance || 0;
  const totalBorrowed = yourBorrows.data?.yourBalance || 0;
  // const netWorth = totalSupplied - totalBorrowed; // Removed usage for header

  // Calculate borrowing capacity (80% LTV - Loan to Value ratio)
  const LTV_RATIO = 0.8; // 80% of collateral can be borrowed
  const maxBorrowCapacity = totalSupplied * LTV_RATIO;
  const availableToBorrow = maxBorrowCapacity - totalBorrowed;

  // Calculate Net APY (simplified - you can enhance this with weighted average)
  const avgSupplyAPY = yourSupplies.data?.yourSupplies?.length > 0
    ? yourSupplies.data.yourSupplies.reduce((acc, t) => acc + parseFloat(t.supplyAPYRate || 0), 0) / yourSupplies.data.yourSupplies.length
    : 0;

  const avgBorrowAPY = yourBorrows.data?.yourBorrows?.length > 0
    ? yourBorrows.data.yourBorrows.reduce((acc, t) => acc + parseFloat(t.borrowAPYRate || 0), 0) / yourBorrows.data.yourBorrows.length
    : 0;

  // Calculate Global Market Stats
  const globalMarketSize = tokens.data?.reduce((acc, t) => acc + parseFloat(t.totalSuppliedInContract.inDollars || 0), 0) || 0;
  const globalTotalAvailable = tokens.data?.reduce((acc, t) => acc + parseFloat(t.availableAmountInContract.inDollars || 0), 0) || 0;
  const globalTotalBorrows = tokens.data?.reduce((acc, t) => acc + parseFloat(t.totalBorrowedInContract.inDollars || 0), 0) || 0;

  const formatCompactNumber = (number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(number);
  };

  return (
    <div className="min-h-screen bg-[#0F1419]">
      <Head>
        <title>Cetra</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ModernNavbar />

      {/* Show page IMMEDIATELY - don't wait for Web3! */}
      <div className="max-w-[1050px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 relative">

        {/* Clean Market Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/midllogo.jpg"
                alt="DeLend"
                className="w-8 h-8 rounded-lg"
              />
              <h1 className="text-2xl font-semibold text-white">MIDL Market</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>v3</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Net worth</div>
              <div className="text-3xl font-bold text-white tracking-tight">${(totalSupplied - totalBorrowed).toFixed(2)}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Net Fee</div>
                <div className="w-3.5 h-3.5 rounded-full border border-gray-600 flex items-center justify-center text-[10px] text-gray-500 cursor-help">i</div>
              </div>
              <div className="text-3xl font-bold text-white tracking-tight">0.00%</div>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex justify-between items-center mb-8">
          <div className="bg-[#1C1C1E] p-1.5 rounded-xl border border-[#2C2C2E] inline-flex">
            <button
              onClick={() => setActiveTab('supply')}
              className={`w-48 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'supply'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' // Bright blue + glow
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Supply
            </button>
            <button
              onClick={() => setActiveTab('borrow')}
              className={`w-48 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'borrow'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' // Bright blue + glow
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Borrow
            </button>
          </div>

          <a
            href="https://midlfaucet.cetra.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-[#2C2C2E] px-4 py-2.5 rounded-xl"
          >
            <span>Faucet</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>

        {/* TAB CONTENT - Full Width Container */}
        <div className="w-full">

          {/* SUPPLY TAB CONTENT */}
          {activeTab === 'supply' && (
            <div className="space-y-6">
              {/* Your Supplies Section */}
              <div className="bg-[#1C1C1E] rounded-xl border border-[#2C2C2E] overflow-hidden shadow-sm">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-[#2C2C2E] transition-colors"
                  onClick={() => setShowYourSupplies(!showYourSupplies)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-lg font-bold text-white tracking-tight">Your supplies</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">Balance</div>
                        <div className="text-xl font-bold text-white tracking-tight">${totalSupplied.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">Rate</div>
                        <div className="text-xl font-bold text-green-400 tracking-tight">{(avgSupplyAPY * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">Collateral</div>
                        <div className="text-xl font-bold text-white tracking-tight">${totalSupplied.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white transition-colors bg-[#252527] p-2 rounded-lg">
                    <svg className={`w-5 h-5 transition-transform duration-300 ${showYourSupplies ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {showYourSupplies && (
                  <div className="border-t border-[#2C2C2E]">
                    {!yourSupplies.data ? (
                      <div className="px-6 py-4">
                        <TableSkeleton rows={2} />
                      </div>
                    ) : yourSupplies.data?.yourSupplies?.length > 0 ? (
                      <div className="w-full">
                        <table className="w-full table-fixed">
                          <thead className="bg-[#252527]/50">
                            <tr className="text-left border-b border-[#2C2C2E]">
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[30%]">Asset</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[25%]">Balance</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[15%]">Rate</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[30%] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yourSupplies.data.yourSupplies.map((token) => (
                              <tr key={token.tokenAddress} className="border-b border-[#2C2C2E] hover:bg-[#252527] transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full ring-2 ring-[#2C2C2E] group-hover:ring-[#3C3C3E] transition-all flex-shrink-0 overflow-hidden relative flex items-center justify-center bg-[#151921]">
                                      <img src={token.image?.src} alt={token.name} className={`object-cover w-full h-full ${token.name === "CET" ? "scale-[1.7] translate-y-[2px]" : ""}`} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-white font-semibold text-base truncate">{token.name}</div>
                                      <div className="text-gray-400 text-xs font-medium">{token.symbol}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-white font-semibold text-base">{parseFloat(token.userTokenLentAmount.amount).toFixed(4)}</div>
                                    <div className="text-gray-400 text-xs font-medium">${parseFloat(token.userTokenLentAmount.inDollars).toFixed(2)}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-green-400 font-bold text-base">{(parseFloat(token.supplyAPYRate || 0) * 100).toFixed(2)}%</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => openModal('supply', token)}
                                      className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/20 hover:border-transparent px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 min-w-[90px]"
                                    >
                                      Supply
                                    </button>
                                    <button
                                      onClick={() => openModal('withdraw', token)}
                                      className="bg-[#2C2C2E] hover:bg-[#3C3C3E] text-white px-4 py-2 rounded-lg text-sm font-semibold border border-[#3C3C3E] hover:border-[#4C4C4E] transition-all duration-200 min-w-[90px]"
                                    >
                                      Withdraw
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-5 py-12 text-center">
                        <div className="text-gray-500 mb-2">No active supply positions</div>
                        <div className="text-sm text-gray-600">Supply assets below to start earning interest</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assets to Supply Section */}
              <div className="bg-[#1C1C1E] rounded-xl border border-[#2C2C2E] overflow-hidden shadow-sm">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-[#2C2C2E] transition-colors"
                  onClick={() => setShowAssetsToSupply(!showAssetsToSupply)}
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white tracking-tight">Assets to supply</h2>
                  </div>
                  <button className="text-gray-400 hover:text-white transition-colors bg-[#252527] p-2 rounded-lg">
                    <svg className={`w-5 h-5 transition-transform duration-300 ${showAssetsToSupply ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {showAssetsToSupply && (
                  <div className="border-t border-[#2C2C2E]">
                    {!tokens.data ? (
                      <div className="px-6 py-4">
                        <TableSkeleton rows={3} />
                      </div>
                    ) : (
                      <div className="w-full">
                        <table className="w-full table-fixed">
                          <thead className="bg-[#252527]/50">
                            <tr className="text-left border-b border-[#2C2C2E]">
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[20%]">Asset</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[20%]">Wallet Balance</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[12%]">Rate</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[13%] text-center">Collateral</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[25%] text-right"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {tokens.data?.map((token) => (
                              <tr key={token.tokenAddress} className="border-b border-[#2C2C2E] hover:bg-[#252527] transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full ring-2 ring-[#2C2C2E] group-hover:ring-[#3C3C3E] transition-all flex-shrink-0 overflow-hidden relative flex items-center justify-center bg-[#151921]">
                                      <img src={token.image?.src} alt={token.name} className={`object-cover w-full h-full ${token.name === "CET" ? "scale-[1.7] translate-y-[2px]" : ""}`} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-white font-semibold text-base truncate">{token.name}</div>
                                      <div className="text-gray-400 text-xs font-medium">{token.symbol}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-white font-semibold text-base">{parseFloat(token.walletBalance.amount).toFixed(4)}</div>
                                    <div className="text-gray-400 text-xs font-medium">${parseFloat(token.walletBalance.inDollars).toFixed(2)}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-green-400 font-bold text-base">{(parseFloat(token.supplyAPYRate || 0) * 100).toFixed(2)}%</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-green-500 font-bold text-lg">✓</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => openModal('supply', token)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 min-w-[100px]"
                                    >
                                      Supply
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BORROW TAB CONTENT */}
          {activeTab === 'borrow' && (
            <div className="space-y-6">

              {/* Your Borrows Section */}
              <div className="bg-[#1C1C1E] rounded-xl border border-[#2C2C2E] overflow-hidden shadow-sm">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-[#2C2C2E] transition-colors"
                  onClick={() => setShowYourBorrows(!showYourBorrows)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-lg font-bold text-white tracking-tight">Your borrows</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">Balance</div>
                        <div className="text-xl font-bold text-white tracking-tight">${totalBorrowed.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">Fixed Fee</div>
                        <div className="text-xl font-bold text-red-400 tracking-tight">{(avgBorrowAPY * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">Available</div>
                        <div className="text-xl font-bold text-white tracking-tight">${availableToBorrow.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white transition-colors bg-[#252527] p-2 rounded-lg">
                    <svg className={`w-5 h-5 transition-transform duration-300 ${showYourBorrows ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {showYourBorrows && (
                  <div className="border-t border-[#2C2C2E]">
                    {!yourBorrows.data ? (
                      <div className="px-6 py-4">
                        <TableSkeleton rows={2} />
                      </div>
                    ) : yourBorrows.data?.yourBorrows?.length > 0 ? (
                      <div className="w-full">
                        <table className="w-full table-fixed">
                          <thead className="bg-[#252527]/50">
                            <tr className="text-left border-b border-[#2C2C2E]">
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[25%]">Asset</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[20%]">Debt</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[12%]">Fixed Fee</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[13%]">APY Type</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[30%] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yourBorrows.data.yourBorrows.map((token) => (
                              <tr key={token.tokenAddress} className="border-b border-[#2C2C2E] hover:bg-[#252527] transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full ring-2 ring-[#2C2C2E] group-hover:ring-[#3C3C3E] transition-all flex-shrink-0 overflow-hidden relative flex items-center justify-center bg-[#151921]">
                                      <img src={token.image?.src} alt={token.name} className={`object-cover w-full h-full ${token.name === "CET" ? "scale-[1.7] translate-y-[2px]" : ""}`} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-white font-semibold text-base truncate">{token.name}</div>
                                      <div className="text-gray-400 text-xs font-medium">{token.symbol}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-white font-semibold text-base">{parseFloat(token.userTokenBorrowedAmount.amount).toFixed(4)}</div>
                                    <div className="text-gray-400 text-xs font-medium">${parseFloat(token.userTokenBorrowedAmount.inDollars).toFixed(2)}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-red-400 font-bold text-base">{(parseFloat(token.borrowAPYRate || 0) * 100).toFixed(2)}%</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-gray-400 text-sm font-medium bg-[#2C2C2E] px-2 py-1 rounded">Fixed</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => openModal('repay', token)}
                                      className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/20 hover:border-transparent px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 min-w-[90px]"
                                    >
                                      Repay
                                    </button>
                                    <button
                                      onClick={() => openModal('borrow', token)}
                                      className="bg-[#2C2C2E] hover:bg-[#3C3C3E] text-white px-4 py-2 rounded-lg text-sm font-semibold border border-[#3C3C3E] hover:border-[#4C4C4E] transition-all duration-200 min-w-[90px]"
                                    >
                                      Borrow
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-5 py-12 text-center">
                        <div className="text-gray-500 mb-2">No active borrows</div>
                        <div className="text-sm text-gray-600">Borrow assets below against your collateral</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assets to Borrow Section */}
              <div className="bg-[#1C1C1E] rounded-xl border border-[#2C2C2E] overflow-hidden shadow-sm">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-[#2C2C2E] transition-colors"
                  onClick={() => setShowAssetsToBorrow(!showAssetsToBorrow)}
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white tracking-tight">Assets to borrow</h2>
                  </div>
                  <button className="text-gray-400 hover:text-white transition-colors bg-[#252527] p-2 rounded-lg">
                    <svg className={`w-5 h-5 transition-transform duration-300 ${showAssetsToBorrow ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {showAssetsToBorrow && (
                  <div className="border-t border-[#2C2C2E]">
                    {!tokensForBorrow.data ? (
                      <div className="px-6 py-4">
                        <TableSkeleton rows={3} />
                      </div>
                    ) : (
                      <div className="w-full">
                        <table className="w-full table-fixed">
                          <thead className="bg-[#252527]/50">
                            <tr className="text-left border-b border-[#2C2C2E]">
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[28%]">Asset</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[25%]">
                                Available
                              </th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[15%]">Fixed Fee</th>
                              <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[32%] text-right"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {tokensForBorrow.data?.map((token) => {
                              // ✅ FIX: Use user's actual borrowing power, not pool liquidity
                              const userBorrowPowerInDollars = parseFloat(token.userTotalAmountAvailableForBorrowInDollars || 0);
                              const tokenPriceInDollars = parseFloat(token.oneTokenToDollar || 0);
                              const userCanBorrowInTokens = tokenPriceInDollars > 0 ? userBorrowPowerInDollars / tokenPriceInDollars : 0;

                              // Check protocol has enough liquidity
                              const protocolAvailable = parseFloat(token.availableAmountInContract.amount);
                              const actualAvailableToBorrow = Math.min(userCanBorrowInTokens, protocolAvailable);
                              const actualAvailableInDollars = actualAvailableToBorrow * tokenPriceInDollars;

                              return (
                                <tr key={token.tokenAddress} className="border-b border-[#2C2C2E] hover:bg-[#252527] transition-colors group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full ring-2 ring-[#2C2C2E] group-hover:ring-[#3C3C3E] transition-all flex-shrink-0 overflow-hidden relative flex items-center justify-center bg-[#151921]">
                                        <img src={token.image?.src} alt={token.name} className={`object-cover w-full h-full ${token.name === "CET" ? "scale-[1.7] translate-y-[2px]" : ""}`} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-white font-semibold text-base truncate">{token.name}</div>
                                        <div className="text-gray-400 text-xs font-medium">{token.symbol}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <div className="text-white font-semibold text-base">{actualAvailableToBorrow.toFixed(2)}</div>
                                      <div className="text-gray-400 text-xs font-medium">${actualAvailableInDollars.toFixed(2)}</div>
                                      {totalSupplied === 0 && (
                                        <div className="text-yellow-500/80 text-xs mt-1 font-medium">Supply first to borrow</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-red-400 font-bold text-base">{(parseFloat(token.borrowAPYRate || 0) * 100).toFixed(2)}%</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => openModal('borrow', token)}
                                        disabled={actualAvailableToBorrow <= 0}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-[#2C2C2E] disabled:text-gray-500 text-white shadow-lg shadow-blue-900/20 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:shadow-none disabled:cursor-not-allowed w-[100px]"
                                      >
                                        Borrow
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* End of content wrapper */}
      </div>

      {/* Modals - only show when Web3 is ready */}
      {web3 && contract && modalType === 'supply' && selectedToken && (
        <SupplyModal
          token={selectedToken}
          onClose={closeModal}
          onSupply={handleSupply}
          onRefresh={refreshAllData}
          txResult={txResult}
          txError={txError}
        />
      )}
      {web3 && contract && modalType === 'borrow' && selectedToken && (() => {
        // Calculate user's borrow capacity for the selected token
        const tokenPriceInDollars = parseFloat(selectedToken.oneTokenToDollar || 0);
        const userCanBorrowInDollars = Math.max(0, availableToBorrow);
        const userCanBorrowInTokens = tokenPriceInDollars > 0 ? userCanBorrowInDollars / tokenPriceInDollars : 0;

        // Also check protocol has enough liquidity
        const protocolAvailable = parseFloat(selectedToken.availableAmountInContract.amount);
        const actualAvailableToBorrow = Math.min(userCanBorrowInTokens, protocolAvailable);

        return (
          <BorrowModal
            token={selectedToken}
            onClose={closeModal}
            onBorrow={handleBorrow}
            onRefresh={refreshAllData}
            userBorrowCapacity={actualAvailableToBorrow}
            txResult={txResult}
            txError={txError}
          />
        );
      })()}
      {web3 && contract && modalType === 'withdraw' && selectedToken && (
        <WithdrawModal
          token={selectedToken}
          onClose={closeModal}
          onWithdraw={handleWithdraw}
          onRefresh={refreshAllData}
          txResult={txResult}
          txError={txError}
        />
      )}
      {web3 && contract && modalType === 'repay' && selectedToken && (
        <RepayModal
          token={selectedToken}
          onClose={closeModal}
          onRepay={handleRepay}
          onRefresh={refreshAllData}
          txResult={txResult}
          txError={txError}
        />
      )}
    </div>
  );
}

// Force server-side rendering to prevent build timeout
export async function getServerSideProps() {
  return { props: {} };
}
