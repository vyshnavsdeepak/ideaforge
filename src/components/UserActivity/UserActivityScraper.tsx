'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserActivityScraperProps {
  onUserSelected: (username: string) => void;
}

interface ScrapingJob {
  id: string;
  username: string;
  scrapeType: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  postsScraped: number;
  commentsScraped: number;
  newPosts: number;
  newComments: number;
  error: string | null;
}

export function UserActivityScraper({ onUserSelected }: UserActivityScraperProps) {
  const [username, setUsername] = useState('');
  const [scrapeType, setScrapeType] = useState('full');
  const [timeframe, setTimeframe] = useState('all');
  const [limit, setLimit] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<ScrapingJob[]>([]);

  const fetchRecentJobs = useCallback(async () => {
    // This would fetch recent scraping jobs from an API
    // For now, we'll simulate with empty data
    setRecentJobs([]);
  }, []);

  useEffect(() => {
    fetchRecentJobs();
  }, [fetchRecentJobs]);

  const handleScrapeUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user-activity/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          scrapeType,
          timeframe,
          limit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start scraping');
      }

      const data = await response.json();
      setSuccess(`Scraping started for u/${data.username}. Job ID: ${data.jobId}`);
      onUserSelected(data.username);
      fetchRecentJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scraping');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeUser = async () => {
    if (!username.trim()) return;

    setAnalyzing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user-activity/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          analysisType: 'comments',
          limit: 100,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start analysis');
      }

      const data = await response.json();
      setSuccess(`Analysis started for u/${data.username}. Analyzing ${data.itemsToAnalyze} items.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSearchExistingUser = (searchUsername: string) => {
    setUsername(searchUsername);
    onUserSelected(searchUsername);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Reddit User Scraper
        </h2>

        <form onSubmit={handleScrapeUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reddit Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (without u/)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scrape Type
            </label>
            <select
              value={scrapeType}
              onChange={(e) => setScrapeType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="full">Full (Posts + Comments)</option>
              <option value="posts_only">Posts Only</option>
              <option value="comments_only">Comments Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="year">Past Year</option>
              <option value="month">Past Month</option>
              <option value="week">Past Week</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Limit
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              min="1"
              max="5000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Scraping...' : 'Start Scraping'}
            </button>
            <button
              type="button"
              onClick={handleAnalyzeUser}
              disabled={analyzing || !username.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Comments'}
            </button>
          </div>
        </form>

        {/* Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button onClick={clearMessages} className="text-red-600 hover:text-red-800 dark:text-red-400">
                ×
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              <button onClick={clearMessages} className="text-green-600 hover:text-green-800 dark:text-green-400">
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Access
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Search existing users</span>
            <button
              onClick={() => handleSearchExistingUser('entrepreneur')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Sample User
            </button>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Jobs
          </h3>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    u/{job.username}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {job.scrapeType} • {job.status}
                  </div>
                </div>
                <button
                  onClick={() => handleSearchExistingUser(job.username)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}