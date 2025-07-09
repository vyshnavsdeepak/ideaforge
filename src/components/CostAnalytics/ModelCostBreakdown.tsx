'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, formatNumber, formatPercentage } from '../../lib/format-utils';

interface ModelUsage {
  model: string;
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  successRate: number;
  costPerRequest: number;
}

interface ModelCostBreakdownProps {
  period?: string;
  className?: string;
}

export function ModelCostBreakdown({ period = '7d', className = '' }: ModelCostBreakdownProps) {
  const [data, setData] = useState<ModelUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModelBreakdown = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/ai-costs?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch model breakdown');
      const result = await response.json();
      setData(result.modelBreakdown || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchModelBreakdown();
  }, [fetchModelBreakdown]);

  const getModelDisplayName = (model: string) => {
    const modelNames: Record<string, string> = {
      'gemini-2.5-pro': 'Gemini 2.5 Pro',
      'gemini-2.5-flash': 'Gemini 2.5 Flash',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
    };
    return modelNames[model] || model;
  };

  const getModelColor = (model: string) => {
    const colors: Record<string, string> = {
      'gemini-2.5-pro': 'bg-purple-500',
      'gemini-2.5-flash': 'bg-blue-500',
      'gemini-1.5-pro': 'bg-green-500',
      'gemini-1.5-flash': 'bg-yellow-500',
    };
    return colors[model] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="text-gray-500 dark:text-gray-400 text-center">No model data available</div>
      </div>
    );
  }

  const totalCost = data.reduce((sum, model) => sum + model.totalCost, 0);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Model Cost Breakdown
        </h3>

        <div className="space-y-4">
          {data.map((model, index) => {
            const percentage = totalCost > 0 ? (model.totalCost / totalCost) * 100 : 0;
            
            return (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getModelColor(model.model)}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getModelDisplayName(model.model)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(model.totalCost)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({formatPercentage(percentage)})
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${getModelColor(model.model)} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Model stats */}
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Requests</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatNumber(model.totalRequests)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Tokens</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatNumber(model.totalTokens)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Success</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatPercentage(model.successRate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Cost/Req</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(model.costPerRequest)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Total Cost
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalCost)}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Across {data.length} models in the last {period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}
          </p>
        </div>
      </div>
    </div>
  );
}