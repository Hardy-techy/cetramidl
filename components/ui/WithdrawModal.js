import { useState } from 'react';

export default function WithdrawModal({ token, onClose, onWithdraw, onRefresh, txResult, txError }) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setIsLoading(true);
    try {
      await onWithdraw(token, amount);
    } finally {
      setIsLoading(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(token.userTokenLentAmount?.amount || '0');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-[#0B0E14] rounded-xl max-w-md w-full border border-white/[0.08] shadow-2xl relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] relative z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Withdraw {token.name}</h2>
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
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full"></div>
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
                    Supplied: <span className="text-white">{parseFloat(token.userTokenLentAmount?.amount || 0).toFixed(4)}</span>
                  </span>
                </div>
                <div className="relative group">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#151921] border border-white/[0.08] rounded-xl px-4 py-4 text-white text-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-gray-600"
                  />
                  <button
                    onClick={setMaxAmount}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-blue-500/20"
                  >
                    MAX
                  </button>
                </div>
                {amount && (
                  <p className="text-xs text-gray-500 mt-2 px-1 flex items-center gap-1">
                    <span>≈</span> ${(parseFloat(amount) * token.oneTokenToDollar).toFixed(2)} USD
                  </p>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleWithdraw}
                disabled={!amount || parseFloat(amount) <= 0 || isLoading}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none border border-red-500/20 disabled:border-white/5"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  `Withdraw ${token.name}`
                )}
              </button>
            </>
          ) : txResult ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Withdrawal Successful!</h3>
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4 mb-6">
                <p className="text-orange-400 font-bold text-xl">{amount} {token.name}</p>
                <p className="text-gray-400 text-sm mt-1">
                  ≈ ${(parseFloat(amount) * token.oneTokenToDollar).toFixed(2)}
                </p>
              </div>
              <p className="text-gray-400 text-sm mb-6">Tokens withdrawn successfully</p>
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
                onClick={() => onClose()}
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
