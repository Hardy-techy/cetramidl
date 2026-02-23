export default function PortfolioCard({ title, value, subtitle, gradient }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-white/80 font-medium">{title}</h3>
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-2xl">💰</span>
        </div>
      </div>
      <div className="mb-2">
        <p className="text-4xl font-bold text-white">{value}</p>
      </div>
      <p className="text-white/70 text-sm">{subtitle}</p>
    </div>
  );
}

