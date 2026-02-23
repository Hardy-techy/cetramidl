import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSWRConfig } from 'swr';
import { useWeb3 } from '../components/providers/web3';
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

import dynamic from 'next/dynamic';

function MarketComponent() {
    const router = useRouter();
    const { requireInstall, isLoading, connect, contract, web3, isUniversal, chainId, connectedAccount, pushChainContext, sendTransaction: providerSendTransaction } = useWeb3();
    const { account } = useAccount();
    const { tokens, mutate: refreshSupplyAssets, isValidating: isLoadingSupply } = useSupplyAssets();
    const { tokensForBorrow, mutate: refreshBorrowAssets, isValidating: isLoadingBorrow } = useBorrowAssets();
    const { yourSupplies, mutate: refreshYourSupplies, isValidating: isLoadingYourSupplies } = useYourSupplies();
    const { yourBorrows, mutate: refreshYourBorrows, isValidating: isLoadingYourBorrows } = useYourBorrows();

    // Market page - no redirect needed

    const [modalType, setModalType] = useState(null); // 'supply', 'withdraw', 'borrow', 'repay'
    const [selectedToken, setSelectedToken] = useState(null);
    const [txResult, setTxResult] = useState(null);
    const [txError, setTxError] = useState(null);
    const [forceUpdate, setForceUpdate] = useState(0); // Force remount counter

    const toWei = (value) => web3 ? web3.utils.toWei(value.toString()) : value;

    // FORCE COMPONENT REMOUNT when web3 becomes ready
    useEffect(() => {
        if (web3 && contract && !isLoading && forceUpdate === 0) {
            setTimeout(() => {
                setForceUpdate(1); // Trigger re-render which will remount hooks with web3 ready
            }, 200);
        }
    }, [web3, contract, isLoading, forceUpdate]);

    // Function to refresh all data - Properly trigger SWR revalidation
    const refreshAllData = async () => {
        // Close modal first for a cleaner experience
        setModalType(null);
        setSelectedToken(null);
        setTxResult(null);
        setTxError(null);

        // Small delay to let modal close animation finish
        await new Promise(resolve => setTimeout(resolve, 300));

        // FORCE refresh all data - Call mutate() with no arguments to trigger revalidation
        try {
            // SEQUENTIAL Refresh with delays to avoid 429 Rate Limit
            await refreshSupplyAssets();
            await new Promise(r => setTimeout(r, 200));

            await refreshBorrowAssets();
            await new Promise(r => setTimeout(r, 200));

            await refreshYourSupplies();
            await new Promise(r => setTimeout(r, 200));

            await refreshYourBorrows();
        } catch (error) {
            // Error during refresh
        }
    };

    // Helper calculation for global stats
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

    const formatCompactQuantity = (number) => {
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 2
        }).format(number);
    };

    // Handler functions (simplified for brevity, identical to dashboard)
    // Send transaction helper - using centralized provider logic
    const sendTransaction = async (method, fromAddress) => {
        return await providerSendTransaction(method, fromAddress);
    };

    const handleSupply = async (token, value) => {
        /* Identical logic to dashboard.js */
        const fromAddress = connectedAccount || account.data;
        if (!fromAddress) throw new Error("No wallet connected");
        try {
            const tokenInst = new web3.eth.Contract(MockTokens.abi || MockTokens, token.tokenAddress);
            const valueInWei = toWei(value);
            const walletBalance = await tokenInst.methods.balanceOf(fromAddress).call();
            if (web3.utils.toBN(walletBalance).lt(web3.utils.toBN(valueInWei))) throw new Error("Insufficient balance");
            // Infinite Approval Logic
            const allowance = await tokenInst.methods.allowance(fromAddress, contract.options.address).call();
            const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

            if (web3.utils.toBN(allowance).lt(web3.utils.toBN(valueInWei))) {
                console.log('Approving Infinite...');
                await trackPromise(sendTransaction(tokenInst.methods.approve(contract.options.address, MAX_UINT256), fromAddress));
            }
            const result = await trackPromise(sendTransaction(contract.methods.lend(token.tokenAddress, valueInWei), fromAddress));
            setTxResult(result); await refreshAllData();
        } catch (err) { setTxError(err); }
    };

    // NOTE: Assuming User still wants Supply/Borrow actions available here

    const openModal = (type, token) => {
        setModalType(type); setSelectedToken(token); setTxResult(null); setTxError(null);
    };
    const closeModal = () => {
        setModalType(null); setSelectedToken(null); setTxResult(null); setTxError(null);
    };

    return (
        <div className="min-h-screen bg-[#0F1419]">
            <Head>
                <title>Cetra</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <ModernNavbar />

            <div className="max-w-[1050px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 relative">

                {/* Market Stats Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <img src="/midllogo.jpg" alt="DeLend" className="w-8 h-8 rounded-lg" />
                            <h1 className="text-2xl font-semibold text-white">MIDL Market</h1>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>v3</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8 max-w-2xl">
                        <div>
                            <div className="text-sm text-gray-400 mb-1">Total market size</div>
                            <div className="text-2xl font-bold text-white tracking-tight">{formatCompactNumber(globalMarketSize)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400 mb-1">Total available</div>
                            <div className="text-2xl font-bold text-white tracking-tight">{formatCompactNumber(globalTotalAvailable)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-400 mb-1">Total borrows</div>
                            <div className="text-2xl font-bold text-white tracking-tight">{formatCompactNumber(globalTotalBorrows)}</div>
                        </div>
                    </div>
                </div>

                {/* Global Assets List */}
                <div className="bg-[#1C1C1E] rounded-xl border border-[#2C2C2E] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#2C2C2E] flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white tracking-tight">MIDL Assets</h2>
                    </div>

                    {!tokens.data ? (
                        <div className="px-6 py-4"><TableSkeleton rows={5} /></div>
                    ) : (
                        <div className="w-full">
                            <table className="w-full table-fixed">
                                <thead className="bg-[#252527]/50">
                                    <tr className="text-left border-b border-[#2C2C2E]">
                                        <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[30%]">Asset</th>
                                        <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[20%]">Total Supplied</th>
                                        <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[15%]">Supply Rate</th>
                                        <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[20%]">Total Borrowed</th>
                                        <th className="px-6 py-4 text-gray-400 text-xs font-semibold uppercase tracking-wider w-[15%]">Borrow APY</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tokens.data.map((token) => (
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
                                                    <div className="text-white font-semibold text-base">{formatCompactQuantity(parseFloat(token.totalSuppliedInContract.amount))}</div>
                                                    <div className="text-gray-400 text-xs font-medium">{formatCompactNumber(parseFloat(token.totalSuppliedInContract.inDollars))}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-green-400 font-bold text-base">{(parseFloat(token.supplyAPYRate || 0) * 100).toFixed(2)}%</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-white font-semibold text-base">{formatCompactQuantity(parseFloat(token.totalBorrowedInContract.amount))}</div>
                                                    <div className="text-gray-400 text-xs font-medium">{formatCompactNumber(parseFloat(token.totalBorrowedInContract.inDollars))}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-red-400 font-bold text-base">{(parseFloat(token.borrowAPYRate || 0) * 100).toFixed(2)}%</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {web3 && contract && modalType === 'supply' && selectedToken && (
                <SupplyModal token={selectedToken} onClose={closeModal} onSupply={handleSupply} onRefresh={refreshAllData} txResult={txResult} txError={txError} />
            )}
        </div>
    );
}
export default dynamic(() => Promise.resolve(MarketComponent), { ssr: false });
