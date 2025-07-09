'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RedditPost {
  id: string;
  redditId: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  score: number;
  upvotes: number;
  downvotes: number;
  numComments: number;
  permalink: string;
  createdUtc: string;
  processedAt: string | null;
  processingError: string | null;
  status: 'processed' | 'unprocessed' | 'failed' | 'processing';
  opportunityCount: number;
  viableOpportunityCount: number;
  opportunities: Array<{
    id: string;
    title: string;
    overallScore: number;
    viabilityThreshold: boolean;
    createdAt: string;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: {
    posts: RedditPost[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: {
      total: number;
      processed: number;
      unprocessed: number;
      failed: number;
    };
    subreddits: Array<{
      name: string;
      count: number;
    }>;
  };
}

const statusColors = {
  processed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  unprocessed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const statusIcons = {
  processed: '✅',
  unprocessed: '⏳',
  failed: '❌',
  processing: '🔄',
};

export default function RedditPostsPage() {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    subreddit: '',
    status: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [stats, setStats] = useState<{
    total: number;
    processed: number;
    unprocessed: number;
    failed: number;
  } | null>(null);
  const [subreddits, setSubreddits] = useState<Array<{ name: string; count: number }>>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/posts?${queryParams}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setPosts(data.data.posts);
        setStats(data.data.stats);
        setSubreddits(data.data.subreddits);
        setPagination(data.data.pagination);
      } else {
        setError('Failed to fetch posts');
      }
    } catch {
      setError('Error fetching posts');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? parseInt(value) : 1, // Reset to page 1 for non-page filters
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRedditUrl = (permalink: string) => {
    return `https://reddit.com${permalink}`;
  };

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading Reddit posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📝 Reddit Posts
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Raw Reddit data with processing status and linked opportunities
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Posts</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.processed.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Processed</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.unprocessed.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Unprocessed</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.failed.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Title, content, or author..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Subreddit Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subreddit
              </label>
              <select
                value={filters.subreddit}
                onChange={(e) => handleFilterChange('subreddit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Subreddits</option>
                {subreddits.map(sub => (
                  <option key={sub.name} value={sub.name}>
                    r/{sub.name} ({sub.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Status</option>
                <option value="processed">Processed</option>
                <option value="unprocessed">Unprocessed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  handleFilterChange('sortBy', sortBy);
                  handleFilterChange('sortOrder', sortOrder);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="score-desc">Highest Score</option>
                <option value="score-asc">Lowest Score</option>
                <option value="numComments-desc">Most Comments</option>
                <option value="numComments-asc">Least Comments</option>
              </select>
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[post.status]}`}>
                      {statusIcons[post.status]} {post.status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      r/{post.subreddit}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      by u/{post.author}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
                    {post.content}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <a
                    href={getRedditUrl(post.permalink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                  >
                    View on Reddit →
                  </a>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(post.createdUtc)}
                  </div>
                </div>
              </div>

              {/* Post Metrics */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>⬆️ {post.upvotes}</span>
                <span>⬇️ {post.downvotes}</span>
                <span>💬 {post.numComments}</span>
                <span>📊 {post.score}</span>
              </div>

              {/* Processing Status Details */}
              {post.status === 'failed' && post.processingError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <strong>Processing Error:</strong> {post.processingError}
                  </div>
                </div>
              )}

              {/* Opportunities */}
              {post.opportunities.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Generated Opportunities ({post.opportunityCount})
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {post.viableOpportunityCount} viable
                    </span>
                  </div>
                  <div className="space-y-2">
                    {post.opportunities.map((opp) => (
                      <div key={opp.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <div className="flex-1">
                          <Link
                            href={`/opportunities?id=${opp.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {opp.title}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Score: {opp.overallScore.toFixed(1)} • 
                            {opp.viabilityThreshold ? ' Viable' : ' Not Viable'} • 
                            {formatDate(opp.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {opp.viabilityThreshold && (
                            <span className="text-green-600 dark:text-green-400 text-xs">✅</span>
                          )}
                          <Link
                            href={`/opportunities?id=${opp.id}`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Opportunities */}
              {post.status === 'processed' && post.opportunities.length === 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No opportunities generated from this post
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} posts
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFilterChange('page', String(pagination.page - 1))}
                disabled={!pagination.hasPrev}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handleFilterChange('page', String(pagination.page + 1))}
                disabled={!pagination.hasNext}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="text-red-600 dark:text-red-400 mb-4">
              {error}
            </div>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && !error && (
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              No Reddit posts found matching your criteria.
            </div>
            <button
              onClick={() => setFilters({
                page: 1,
                limit: 20,
                subreddit: '',
                status: '',
                search: '',
                sortBy: 'createdAt',
                sortOrder: 'desc',
              })}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}