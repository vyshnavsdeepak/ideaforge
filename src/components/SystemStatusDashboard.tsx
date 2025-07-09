'use client';

import { useState, useEffect } from 'react';

interface SystemStatus {
  posts: {
    total: number;
    unprocessed: number;
    failed: number;
    lastScrape?: string;
  };
  opportunities: {
    total: number;
    viable: number;
    avgScore: number;
  };
  aiCosts: {
    totalUsage: number;
    recentUsage: number;
    estimatedCost: number;
  };
  dataIssues: {
    duplicates: number;
    malformedUrls: number;
    totalIssues: number;
  };
  health: 'healthy' | 'warning' | 'error';
  recommendations: string[];
}

export function SystemStatusDashboard({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system-status-dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="text-red-600 dark:text-red-400">
          <h3 className="font-medium mb-2">Status Dashboard Error</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchSystemStatus}
            className="mt-3 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '🔴';
      default: return '❓';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            System Status
          </h2>
          <div className="flex items-center gap-2">
            <span className={`text-2xl ${getHealthColor(status.health)}`}>
              {getHealthIcon(status.health)}
            </span>
            <span className={`text-sm font-medium ${getHealthColor(status.health)}`}>
              {status.health.charAt(0).toUpperCase() + status.health.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {status.posts.unprocessed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Unprocessed Posts
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {status.posts.failed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Failed Posts
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {status.opportunities.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Opportunities
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {status.dataIssues.totalIssues}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Data Issues
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {status.recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              💡 Recommended Actions
            </h3>
            <div className="space-y-2">
              {status.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">→</span>
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    {recommendation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              📊 Processing Stats
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Posts:</span>
                <span className="font-medium">{status.posts.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Viable Opportunities:</span>
                <span className="font-medium">{status.opportunities.viable}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Average Score:</span>
                <span className="font-medium">{status.opportunities.avgScore.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recent AI Usage:</span>
                <span className="font-medium">{status.aiCosts.recentUsage}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              🔧 Data Quality
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Duplicate Posts:</span>
                <span className={`font-medium ${status.dataIssues.duplicates > 0 ? 'text-yellow-600' : ''}`}>
                  {status.dataIssues.duplicates}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Malformed URLs:</span>
                <span className={`font-medium ${status.dataIssues.malformedUrls > 0 ? 'text-yellow-600' : ''}`}>
                  {status.dataIssues.malformedUrls}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Last Scrape:</span>
                <span className="font-medium">
                  {status.posts.lastScrape ? new Date(status.posts.lastScrape).toLocaleTimeString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Est. AI Cost:</span>
                <span className="font-medium">${status.aiCosts.estimatedCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Auto-refreshes every 30 seconds</span>
            <button 
              onClick={fetchSystemStatus}
              className="hover:text-gray-700 dark:hover:text-gray-300"
              disabled={loading}
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}