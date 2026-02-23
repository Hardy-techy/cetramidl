import { useState, useEffect } from 'react';

export default function RepayModal({ token, onClose, onRepay, onRefresh, txResult, txError }) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  // Prevent memory leaks on unmount
  useEffect(() => {
    return () => setIsMounted(false);
  }, []);

  const handleRepay = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setIsLoading(true);
    try {
      await onRepay(token, amount);
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(token.userTokenBorrowedAmount?.amount || '0');
  };

  const interest = parseFloat(amount || 0) * parseFloat(token.borrowAPYRate || 0);
  const totalToRepay = parseFloat(amount || 0) + interest;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-[#0B0E14] rounded-xl max-w-md w-full border border-white/[0.08] shadow-2xl relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] relative z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Repay {token.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 relative z-10">
          {!txResult && !txError ? (
            <>
              {/* Token Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                  <img src={token.image?.src} alt={token.name} className="w-12 h-12 rounded-full relative z-10 bg-[#0B0E14]" />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">{token.name}</p>
                  <p className="text-sm text-gray-400">${token.oneTokenToDollar?.toFixed(2)}</p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <div className="flex justify-between mb-2 px-1">
                  <label className="text-sm font-medium text-gray-400">Amount</label>
                  <span className="text-sm text-gray-400">
                    Borrowed: <span className="text-white">{parseFloat(token.userTokenBorrowedAmount?.amount || 0).toFixed(4)}</span>
                  </span>
                </div>
                <div className="relative group">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#151921] border border-white/[0.08] rounded-xl px-4 py-4 text-white text-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                  />
                  <button
                    onClick={setMaxAmount}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-blue-500/20"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Repay Breakdown */}
              <div className="bg-white/[0.03] rounded-xl p-4 mb-6 space-y-3 border border-white/[0.05]">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-400">Principal</span>
                  <span className="text-white font-medium">{parseFloat(amount || 0).toFixed(4)} {token.name}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-400">Est. Interest + Fee</span>
                  <span className="text-yellow-400 font-medium">{interest.toFixed(4)} {token.name}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                  <span className="text-white/80 font-medium">Total to Repay</span>
                  <span className="text-white font-bold text-lg">{totalToRepay.toFixed(4)} {token.name}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRepay}
                disabled={!amount || parseFloat(amount) <= 0 || isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none border border-blue-500/20 disabled:border-white/5"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  `Repay ${token.name}`
                )}
              </button>
            </>
          ) : txResult ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Repayment Successful!</h3>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 mb-6">
                <div className="space-y-2 mb-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Principal:</span>
                    <span className="text-white">{amount} {token.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Interest:</span>
                    <span className="text-yellow-400">{(parseFloat(amount) * parseFloat(token.borrowAPYRate || 0)).toFixed(4)} {token.name}</span>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-2">
                  <p className="text-blue-400 font-bold text-xl">Total: {(parseFloat(amount) + parseFloat(amount) * parseFloat(token.borrowAPYRate || 0)).toFixed(4)} {token.name}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    ≈ ${((parseFloat(amount) + parseFloat(amount) * parseFloat(token.borrowAPYRate || 0)) * token.oneTokenToDollar).toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6">Debt repaid successfully</p>
              <a
                href={`https://explorer.midl.network/tx/${txResult.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center justify-center gap-1 mb-6 hover:underline"
              >
                View on Explorer
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <button
                onClick={() => {
                  onRefresh && onRefresh(); // Trigger manual refresh if needed
                  onClose();
                }}
                className="w-full bg-[#151921] hover:bg-white/5 border border-white/10 text-white py-3 rounded-xl font-semibold transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Transaction Failed</h3>
              <p className="text-red-400/80 text-sm mb-6 max-w-[280px] mx-auto leading-relaxed">{txError?.message || 'An unknown error occurred during the transaction.'}</p>
              <button
                onClick={onClose}
                className="w-full bg-[#151921] hover:bg-white/5 border border-white/10 text-white py-3 rounded-xl font-semibold transition-all"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
