'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserActivityViewerProps {
  username: string;
}

interface UserData {
  user: {
    id: string;
    username: string;
    profileData: unknown;
    accountCreated: string | null;
    linkKarma: number;
    commentKarma: number;
    totalKarma: number;
    lastScraped: string | null;
    postsScraped: number;
    commentsScraped: number;
    scrapingStatus: string | null;
    analysisStatus: string | null;
    opportunitiesFound: number;
  };
  stats: {
    totalPosts: number;
    totalComments: number;
    totalActivity: number;
    analyzedPosts: number;
    analyzedComments: number;
    opportunityPosts: number;
    opportunityComments: number;
  };
  activity: Array<{
    type: 'post' | 'comment';
    id: string;
    redditId: string;
    createdUtc: string;
    subreddit: string;
    score: number;
    title?: string;
    body?: string;
    content?: string;
    analyzed: boolean;
    isOpportunity: boolean | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function UserActivityViewer({ username }: UserActivityViewerProps) {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'posts' | 'comments'>('all');

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/user-activity/${username}?page=${currentPage}&type=${filter}&limit=20`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  }, [username, currentPage, filter]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-red-600 dark:text-red-400 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium mb-2">No Data Found</h3>
          <p>No data found for user u/{username}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Profile */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            u/{data.user.username}
          </h2>
          <div className="flex space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(data.user.scrapingStatus)} bg-gray-100 dark:bg-gray-700`}>
              Scraping: {data.user.scrapingStatus || 'pending'}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(data.user.analysisStatus)} bg-gray-100 dark:bg-gray-700`}>
              Analysis: {data.user.analysisStatus || 'pending'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.user.totalKarma?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Karma</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.stats.totalPosts}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.stats.totalComments}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Comments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.user.opportunitiesFound}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Opportunities</div>
          </div>
        </div>

        {data.user.accountCreated && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Account created: {formatDate(data.user.accountCreated)}
          </div>
        )}
      </div>

      {/* Activity Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activity ({data.pagination.totalCount} items)
          </h3>
          <div className="flex space-x-2">
            {(['all', 'posts', 'comments'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setFilter(type);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Items */}
        <div className="space-y-4">
          {data.activity.map((item) => (
            <div
              key={item.id}
              className={`p-4 border rounded-lg ${
                item.isOpportunity
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.type === 'post' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                    }`}>
                      {item.type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      r/{item.subreddit}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.score} points
                    </span>
                    {item.isOpportunity && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full dark:bg-green-900/20 dark:text-green-400">
                        Opportunity
                      </span>
                    )}
                  </div>
                  
                  {item.title && (
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {item.title}
                    </h4>
                  )}
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {item.body || item.content}
                  </p>
                  
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(item.createdUtc)}
                    {item.analyzed && (
                      <span className="ml-2 text-green-600 dark:text-green-400">
                        • Analyzed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!data.pagination.hasPrev}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
            >
              Previous
            </button>
            
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!data.pagination.hasNext}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}