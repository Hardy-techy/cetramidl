export default function TableSkeleton({ rows = 3 }) {
  return (
    <div className="animate-pulse">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700/50">
            <th className="px-5 py-3"><div className="h-3 bg-gray-700 rounded w-20"></div></th>
            <th className="px-5 py-3"><div className="h-3 bg-gray-700 rounded w-24"></div></th>
            <th className="px-5 py-3"><div className="h-3 bg-gray-700 rounded w-16"></div></th>
            <th className="px-5 py-3"><div className="h-3 bg-gray-700 rounded w-20"></div></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-gray-700/30">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="h-4 bg-gray-700 rounded w-20 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-16"></div>
              </td>
              <td className="px-5 py-4">
                <div className="h-4 bg-gray-700 rounded w-12"></div>
              </td>
              <td className="px-5 py-4">
                <div className="h-8 bg-gray-700 rounded w-20 ml-auto"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

