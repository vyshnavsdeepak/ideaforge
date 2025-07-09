'use client';

import { PostCostAnalysis } from '../../../components/CostAnalytics/PostCostAnalysis';

export function PostAnalyticsContent() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Per-Post Cost Analysis
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Detailed cost breakdown for individual post analyses
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <a
                href="/analytics/costs"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← Back to Cost Overview
              </a>
              <a
                href="/jobs"
                className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
              >
                Jobs Dashboard
              </a>
            </div>
          </div>
        </div>

        {/* Post Cost Analysis Component */}
        <PostCostAnalysis limit={100} />

        {/* Additional Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📊 Understanding Cost Metrics
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <strong className="text-gray-900 dark:text-white">Total Cost:</strong> Complete cost for analyzing this post
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Input/Output Cost:</strong> Breakdown by token type
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Cost per Token:</strong> Efficiency metric for analysis
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Processing Time:</strong> Time taken to complete analysis
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Analysis Type:</strong> Batch (discounted) vs Individual
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🎯 Optimization Tips
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <strong className="text-gray-900 dark:text-white">Use Batch Processing:</strong> 50% cost reduction
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Choose Right Model:</strong> Flash for speed, Pro for accuracy
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Optimize Prompts:</strong> Reduce unnecessary tokens
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Monitor Success Rate:</strong> Failed requests waste money
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Set Cost Alerts:</strong> Prevent unexpected expenses
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}