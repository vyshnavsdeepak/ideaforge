'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, formatNumber } from '../../lib/format-utils';

interface CostSummaryData {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  totalPostsAnalyzed: number;
  totalOpportunities: number;
  averageSuccessRate: number;
  costPerRequest: number;
  costPerPost: number;
  costPerOpportunity: number;
}

interface CostSummaryCardProps {
  period?: string;
  className?: string;
}

export function CostSummaryCard({ period = '7d', className = '' }: CostSummaryCardProps) {
  const [data, setData] = useState<CostSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCostSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/ai-costs?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch cost data');
      const result = await response.json();
      setData(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchCostSummary();
  }, [fetchCostSummary]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="text-red-500">Failed to load cost data</div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Cost',
      value: formatCurrency(data.totalCost),
      subtext: `${formatNumber(data.totalRequests)} requests`,
      icon: '💰',
      highlight: true,
    },
    {
      label: 'Posts Analyzed',
      value: formatNumber(data.totalPostsAnalyzed),
      subtext: `${formatCurrency(data.costPerPost)}/post`,
      icon: '📊',
    },
    {
      label: 'Opportunities Found',
      value: formatNumber(data.totalOpportunities),
      subtext: `${formatCurrency(data.costPerOpportunity)}/opp`,
      icon: '💡',
    },
    {
      label: 'Success Rate',
      value: `${data.averageSuccessRate.toFixed(1)}%`,
      subtext: `${formatNumber(data.totalTokens)} tokens`,
      icon: '✅',
    },
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          AI Cost Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                metric.highlight
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {metric.label}
                  </p>
                  <p className={`text-2xl font-bold ${
                    metric.highlight
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {metric.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {metric.subtext}
                  </p>
                </div>
                <span className="text-2xl ml-2">{metric.icon}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Period: Last {period === '24h' ? '24 hours' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}
          </p>
          <button
            onClick={fetchCostSummary}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}