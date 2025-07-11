'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';

interface BackfillStats {
  totalOpportunities: number;
  missingData: number;
  needsBackfill: boolean;
}

interface BackfillResult {
  success: boolean;
  message: string;
  jobId?: string;
  batchSize?: number;
  skipExisting?: boolean;
}

export function BackfillOpportunitySolutions() {
  const [stats, setStats] = useState<BackfillStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [skipExisting, setSkipExisting] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/backfill-opportunity-solutions');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching backfill stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerBackfill = async () => {
    setBackfillLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/backfill-opportunity-solutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize,
          skipExisting,
        }),
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        // Refresh stats after successful trigger
        setTimeout(fetchStats, 1000);
      }
    } catch (error) {
      console.error('Error triggering backfill:', error);
      setResult({
        success: false,
        message: 'Failed to trigger backfill job',
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Backfill Opportunity Solutions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Add missing makeshift/software solution data to existing opportunities
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Display */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Opportunities</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {stats.totalOpportunities}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400">Missing Data</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {stats.missingData}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Complete</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {stats.totalOpportunities - stats.missingData}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backfill Controls */}
      <div className="border-t dark:border-gray-700 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Batch Size
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Number of opportunities to process per batch (1-50)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Skip Existing
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={skipExisting}
                onChange={(e) => setSkipExisting(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Only process opportunities missing solution data
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={triggerBackfill}
          disabled={backfillLoading || !stats?.needsBackfill}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {backfillLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Triggering Backfill...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              {stats?.needsBackfill ? 'Start Backfill' : 'No Backfill Needed'}
            </>
          )}
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div className={`mt-4 p-4 rounded-lg ${
          result.success 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <p className={`font-medium ${
              result.success 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {result.message}
            </p>
          </div>
          
          {result.success && result.jobId && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <p>Job ID: {result.jobId}</p>
              <p>Batch Size: {result.batchSize}</p>
              <p>Skip Existing: {result.skipExisting ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          What this does:
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Re-analyzes existing opportunities using the latest AI model</li>
          <li>• Adds missing makeshift vs software solution comparisons</li>
          <li>• Processes opportunities in batches to manage AI costs</li>
          <li>• Updates the opportunity records with new solution data</li>
        </ul>
      </div>
    </div>
  );
}