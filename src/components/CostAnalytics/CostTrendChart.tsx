'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '../../lib/format-utils';

interface DailyUsage {
  date: string;
  totalCost: number;
  totalRequests: number;
  postsAnalyzed: number;
  opportunitiesFound: number;
  successRate: number;
}

interface CostTrendChartProps {
  period?: string;
  className?: string;
}

export function CostTrendChart({ period = '7d', className = '' }: CostTrendChartProps) {
  const [data, setData] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'cost' | 'requests' | 'posts' | 'opportunities'>('cost');

  const fetchCostTrends = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/ai-costs?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch cost trends');
      const result = await response.json();
      setData(result.dailyUsage || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchCostTrends();
  }, [fetchCostTrends]);

  const getMetricValue = (item: DailyUsage) => {
    switch (selectedMetric) {
      case 'cost': return item.totalCost;
      case 'requests': return item.totalRequests;
      case 'posts': return item.postsAnalyzed;
      case 'opportunities': return item.opportunitiesFound;
      default: return 0;
    }
  };

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'cost': return 'Cost';
      case 'requests': return 'API Requests';
      case 'posts': return 'Posts Analyzed';
      case 'opportunities': return 'Opportunities Found';
      default: return '';
    }
  };

  const formatMetricValue = (value: number) => {
    return selectedMetric === 'cost' ? formatCurrency(value) : value.toFixed(0);
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="text-gray-500 dark:text-gray-400 text-center">No data available</div>
      </div>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(item => getMetricValue(item)));
  const minValue = Math.min(...data.map(item => getMetricValue(item)));
  const range = maxValue - minValue || 1;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cost Trends
          </h3>
          <div className="flex gap-2">
            {(['cost', 'requests', 'posts', 'opportunities'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  selectedMetric === metric
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Simple bar chart */}
        <div className="relative h-64">
          <div className="absolute inset-0 flex items-end justify-between gap-1">
            {data.map((item, index) => {
              const value = getMetricValue(item);
              const height = ((value - minValue) / range) * 100;
              
              return (
                <div
                  key={index}
                  className="flex-1 relative group"
                  style={{ maxWidth: `${100 / data.length}%` }}
                >
                  <div
                    className="bg-blue-500 dark:bg-blue-600 rounded-t transition-all duration-300 hover:bg-blue-600 dark:hover:bg-blue-500"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      <div className="font-semibold">{formatDate(item.date)}</div>
                      <div>{formatMetricValue(value)}</div>
                      <div className="text-gray-300">Success: {item.successRate.toFixed(1)}%</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 -ml-12 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatMetricValue(maxValue)}</span>
            <span>{formatMetricValue((maxValue + minValue) / 2)}</span>
            <span>{formatMetricValue(minValue)}</span>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDate(data[0].date)}</span>
          <span className="text-center">{getMetricLabel()}</span>
          <span>{formatDate(data[data.length - 1].date)}</span>
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatMetricValue(data.reduce((sum, item) => sum + getMetricValue(item), 0))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Average</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatMetricValue(data.reduce((sum, item) => sum + getMetricValue(item), 0) / data.length)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Peak</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatMetricValue(maxValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Trend</p>
            <p className="text-sm font-semibold">
              {data.length >= 2 && getMetricValue(data[data.length - 1]) > getMetricValue(data[0]) ? (
                <span className="text-green-600 dark:text-green-400">↑ Up</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">↓ Down</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}