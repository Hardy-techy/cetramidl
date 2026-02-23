export default function MarketCard({ token, type, onAction }) {
  const isSupply = type === 'supply';
  
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all hover:shadow-2xl hover:scale-105">
      {/* Token Header */}
      <div className="flex items-center gap-3 mb-4">
        <img 
          src={token.image?.src || `https://via.placeholder.com/40`} 
          alt={token.name} 
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h3 className="text-xl font-bold text-white">{token.name}</h3>
          <p className="text-sm text-gray-400">
            ${token.oneTokenToDollar?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">
            {isSupply ? 'Supply APY' : 'Borrow APY'}
          </span>
          <span className="text-green-400 font-semibold">
            {(parseFloat(token.borrowAPYRate || 0) * 100).toFixed(2)}%
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Your Wallet</span>
          <span className="text-white font-medium">
            {parseFloat(token.walletBalance?.amount || 0).toFixed(4)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Available</span>
          <span className="text-white font-medium">
            {parseFloat(token.availableAmountInContract?.amount || 0).toFixed(2)}
          </span>
        </div>

        {!isSupply && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">LTV</span>
            <span className="text-purple-400 font-medium">
              {(parseFloat(token.LTV || 0) * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Utilization Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Utilization</span>
          <span>{token.utilizationRate?.toFixed(1) || 0}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${Math.min(token.utilizationRate || 0, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        className={`w-full py-3 rounded-xl font-medium transition-all ${
          isSupply
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
            : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
        } text-white shadow-lg hover:shadow-2xl`}
      >
        {isSupply ? 'Supply' : 'Borrow'}
      </button>
    </div>
  );
}

