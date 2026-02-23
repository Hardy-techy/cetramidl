import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function PortfolioChart({ yourSupplies, yourBorrows }) {
  // Portfolio Distribution Chart Data with actual values
  const getPortfolioData = () => {
    // Calculate actual portfolio values from props (using same structure as market.js)
    const totalSupplied = yourSupplies?.data?.yourBalance || 0;
    const totalBorrowed = yourBorrows?.data?.yourBalance || 0;
    const available = Math.max(0, (totalSupplied * 0.8) - totalBorrowed); // 80% LTV

    return {
      labels: ['Supplied Assets', 'Borrowed Assets', 'Available to Borrow'],
      datasets: [{
        data: [totalSupplied, totalBorrowed, available],
        backgroundColor: [
          '#10B981', // Green for supplied
          '#F59E0B', // Orange for borrowed  
          '#8B5CF6', // Purple for available
        ],
        borderColor: [
          '#059669',
          '#D97706',
          '#7C3AED',
        ],
        borderWidth: 2,
      }]
    };
  };

  // Historical Performance Chart Data (Mock data for demonstration)
  const getPerformanceData = () => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const netWorthData = [3500, 3800, 4200, 3900, 4100, 4090];
    const suppliedData = [18000, 18500, 19200, 19000, 19400, 19650];
    const borrowedData = [14500, 14700, 15000, 15100, 15300, 15560];

    return {
      labels,
      datasets: [
        {
          label: 'Net Worth',
          data: netWorthData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Supplied',
          data: suppliedData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Borrowed',
          data: borrowedData,
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          tension: 0.4,
          fill: false,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#D1D5DB',
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            size: 11,
          },
          callback: function(value) {
            return '$' + value.toLocaleString();
          },
        },
      },
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#D1D5DB',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            return context.label + ': $' + value.toLocaleString();
          },
        },
      },
    },
    cutout: '60%',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Portfolio Distribution Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-800 rounded-lg">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Portfolio Distribution</h3>
        </div>
        <div className="h-64">
          <Doughnut data={getPortfolioData()} options={doughnutOptions} />
        </div>
      </div>

      {/* Historical Performance Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-800 rounded-lg">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
        </div>
        <div className="h-64">
          <Line data={getPerformanceData()} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}