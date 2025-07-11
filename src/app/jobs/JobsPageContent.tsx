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

interface CurrentJob {
  id: string;
  type: string;
  subreddit?: string;
  status: 'running' | 'completed';
  progress: number;
  postsProcessed: number;
  postsRequested: number;
  startTime: string;
  endTime?: string;
  cost: number;
}

interface PostMetrics {
  totalPosts: number;
  processedPosts: number;
  unprocessedPosts: number;
  failedPosts: number;
  recentOpportunities: number;
}

interface RecentActivity {
  subreddit: string;
  postsProcessed: number;
  lastUpdate: string;
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

export function JobsPageContent() {
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

  const [currentJobs, setCurrentJobs] = useState<CurrentJob[]>([]);
  const [postMetrics, setPostMetrics] = useState<PostMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/admin/system-status');
        if (!response.ok) {
          throw new Error('Failed to fetch system status');
        }
        
        const data = await response.json();
        
        setSystemHealth(data.systemHealth);
        setJobMetrics({
          ...data.jobMetrics,
          successRate: parseFloat(data.jobMetrics.successRate)
        });
        setCurrentJobs(data.currentJobs || []);
        setPostMetrics(data.postMetrics);
        setRecentActivity(data.recentActivity || []);
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

        {/* Current Jobs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Current Jobs
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <span>Loading jobs...</span>
                  </div>
                </div>
              ) : currentJobs.length > 0 ? (
                currentJobs.map((job) => (
                  <div 
                    key={job.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      job.status === 'running' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        job.status === 'running' 
                          ? 'bg-blue-500 animate-pulse' 
                          : 'bg-green-500'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {job.type === 'batch' ? 'AI Analysis Batch' : `${job.type} Job`}
                          {job.subreddit && ` - r/${job.subreddit}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {job.status === 'running' 
                            ? `Started ${new Date(job.startTime).toLocaleTimeString()}`
                            : job.endTime ? `Completed ${new Date(job.endTime).toLocaleTimeString()}` : 'Completed'
                          }
                          {job.postsProcessed > 0 && ` • ${job.postsProcessed}/${job.postsRequested} posts`}
                          {job.cost > 0 && ` • $${job.cost.toFixed(4)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.status === 'running' && job.postsRequested > 0 && (
                        <>
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, job.progress)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {Math.round(job.progress)}%
                          </span>
                        </>
                      )}
                      {job.status === 'completed' && (
                        <span className="text-sm text-green-600 dark:text-green-400">✓ Done</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No active jobs at the moment</p>
                </div>
              )}
              
              {/* Post Metrics Summary */}
              {postMetrics && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Post Processing Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{postMetrics.totalPosts.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Posts</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-600 dark:text-green-400">{postMetrics.processedPosts.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Processed</div>
                    </div>
                    <div>
                      <div className="font-medium text-yellow-600 dark:text-yellow-400">{postMetrics.unprocessedPosts.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600 dark:text-red-400">{postMetrics.failedPosts}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
                    </div>
                    <div>
                      <div className="font-medium text-blue-600 dark:text-blue-400">{postMetrics.recentOpportunities}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Opportunities (24h)</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Recent Subreddit Activity */}
              {recentActivity.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Subreddit Activity</h3>
                  <div className="space-y-2">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">r/{activity.subreddit}</span>
                        <span className="text-gray-500 dark:text-gray-500">
                          {activity.postsProcessed} posts • Last: {new Date(activity.lastUpdate).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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