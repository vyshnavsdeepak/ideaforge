'use client';

import { useState } from 'react';
import { CostSummaryCard } from '../../../components/CostAnalytics/CostSummaryCard';
import { CostTrendChart } from '../../../components/CostAnalytics/CostTrendChart';
import { ModelCostBreakdown } from '../../../components/CostAnalytics/ModelCostBreakdown';
import { SessionCostTable } from '../../../components/CostAnalytics/SessionCostTable';
import { CostAlertsPanel } from '../../../components/CostAnalytics/CostAlertsPanel';

export function AICostAnalyticsContent() {
  const [period, setPeriod] = useState<string>('7d');

  const periodOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                AI Cost Analytics
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Monitor and optimize your AI usage costs across all models and operations
              </p>
            </div>
            
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Period:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <CostSummaryCard period={period} className="mb-8" />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <CostTrendChart period={period} />
          <ModelCostBreakdown period={period} />
        </div>

        {/* Sessions Table */}
        <SessionCostTable limit={20} className="mb-8" showDetails={true} />

        {/* Cost Alerts */}
        <CostAlertsPanel />

        {/* Additional Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              💡 Cost Optimization Tips
            </h3>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <li>• Use Gemini Flash for batch processing (50% discount)</li>
              <li>• Optimize prompts to reduce token usage</li>
              <li>• Implement caching for repeated analyses</li>
              <li>• Monitor failed requests to reduce waste</li>
            </ul>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              📊 Model Recommendations
            </h3>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <li>• <strong>Gemini 2.5 Flash:</strong> Best for batch analysis</li>
              <li>• <strong>Gemini 2.5 Pro:</strong> Best for complex analysis</li>
              <li>• <strong>Gemini 1.5 Flash:</strong> Free tier available</li>
              <li>• Consider context caching for repeated tasks</li>
            </ul>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              🎯 Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => window.open('/api/analytics/ai-costs?period=7d&details=true', '_blank')}
                className="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                Export Cost Report (JSON)
              </button>
              <button
                onClick={async () => {
                  const response = await fetch('/api/analytics/ai-costs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'aggregate', date: new Date().toISOString() }),
                  });
                  if (response.ok) {
                    alert('Daily aggregation triggered successfully');
                  }
                }}
                className="w-full px-3 py-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Trigger Daily Aggregation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}