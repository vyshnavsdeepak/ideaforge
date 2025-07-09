'use client';

import { useState, useEffect } from 'react';
import { JobTriggersPanel } from '../../components/JobTriggersPanel';
import { CostSummaryCard } from '../../components/CostAnalytics/CostSummaryCard';
import { SessionCostTable } from '../../components/CostAnalytics/SessionCostTable';

interface SystemHealth {
  database: 'online' | 'offline' | 'degraded';
  inngest: 'online' | 'offline' | 'degraded';
  reddit: 'online' | 'offline' | 'degraded';
  gemini: 'online' | 'offline' | 'degraded';
  lastChecked: string;
}

interface JobMetrics {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
}

const healthColors = {
  online: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const healthIcons = {
  online: '🟢',
  offline: '🔴',
  degraded: '🟡',
};

export default function JobsPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'online',
    inngest: 'online',
    reddit: 'online',
    gemini: 'online',
    lastChecked: new Date().toISOString(),
  });

  const [jobMetrics, setJobMetrics] = useState<JobMetrics>({
    totalJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    successRate: 0,
  });

  const [, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Simulate fetching system health and job metrics
    const fetchSystemStatus = async () => {
      try {
        setLoading(true);
        
        // TODO: Replace with actual API calls
        // Mock data for now
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSystemHealth({
          database: 'online',
          inngest: 'online',
          reddit: 'online',
          gemini: 'online',
          lastChecked: new Date().toISOString(),
        });

        setJobMetrics({
          totalJobs: 1247,
          runningJobs: 3,
          completedJobs: 1189,
          failedJobs: 55,
          averageProcessingTime: 145,
          successRate: 95.6,
        });

        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch system status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ⚡ Jobs & System Status
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor system health, job queues, and processing metrics
          </p>
        </div>

        {/* Alert Placeholder */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
            <span className="text-sm text-blue-800 dark:text-blue-200">
              System alerts and notifications will appear here
            </span>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                System Health
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Last checked: {formatDateTime(systemHealth.lastChecked)}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Database</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">PostgreSQL</div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthColors[systemHealth.database]}`}>
                  {healthIcons[systemHealth.database]} {systemHealth.database}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Job Queue</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Inngest</div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthColors[systemHealth.inngest]}`}>
                  {healthIcons[systemHealth.inngest]} {systemHealth.inngest}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Reddit API</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">External</div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthColors[systemHealth.reddit]}`}>
                  {healthIcons[systemHealth.reddit]} {systemHealth.reddit}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Gemini AI</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">External</div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthColors[systemHealth.gemini]}`}>
                  {healthIcons[systemHealth.gemini]} {systemHealth.gemini}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Job Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Job Metrics
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {jobMetrics.totalJobs.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Jobs</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {jobMetrics.runningJobs}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Running</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {jobMetrics.completedJobs.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {jobMetrics.failedJobs}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatTime(jobMetrics.averageProcessingTime)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Time</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {jobMetrics.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Cost Overview */}
        <CostSummaryCard period="24h" className="mb-8" />

        {/* Manual Job Controls */}
        <JobTriggersPanel className="mb-8" />

        {/* Current Jobs (Placeholder) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Current Jobs
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Mock running job */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Scraping r/startups
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Started 2 minutes ago
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full w-3/4"></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">75%</span>
                </div>
              </div>

              {/* Mock queued job */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      AI Analysis Batch #1247
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Queued • 25 posts pending
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Waiting</span>
              </div>

              {/* Empty state placeholder */}
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">Real-time job monitoring will appear here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent AI Sessions */}
        <SessionCostTable limit={10} className="mb-8" />

        {/* Cost Analytics Link */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                💰 Detailed Cost Analytics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View comprehensive AI cost analysis, model breakdowns, and optimization recommendations
              </p>
            </div>
            <a
              href="/analytics/costs"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Analytics →
            </a>
          </div>
        </div>

        {/* Last Update Info */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}