'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, formatNumber, formatDateTime, formatTokens } from '../../lib/format-utils';

interface PostAnalysis {
  id: string;
  postTitle: string;
  subreddit: string;
  model: string;
  analysisType: string;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costPerToken: number;
  isOpportunity: boolean;
  confidence: number | null;
  overallScore: number | null;
  processingTime: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
  session: {
    id: string;
    sessionType: string;
    triggeredBy: string;
    startTime: string;
  } | null;
}

interface PostCostAnalysisProps {
  className?: string;
  subredditFilter?: string;
  modelFilter?: string;
  limit?: number;
}

export function PostCostAnalysis({ 
  className = '', 
  subredditFilter,
  modelFilter,
  limit = 50 
}: PostCostAnalysisProps) {
  const [posts, setPosts] = useState<PostAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    subreddit: subredditFilter || '',
    model: modelFilter || '',
    analysisType: '',
    isOpportunity: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState<{
    totalAnalyses: number;
    totalCost: number;
    successRate: number;
    opportunityRate: number;
    averageCostPerPost: number;
    averageProcessingTime: number;
  } | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        includePostData: 'true',
        ...Object.entries(filters)
          .filter(([, value]) => value !== '')
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      });

      const response = await fetch(`/api/analytics/post-costs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch post analyses');
      
      const result = await response.json();
      setPosts(result.postAnalyses || []);
      setHasMore(result.pagination?.hasMore || false);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters, offset, limit]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOffset(0);
  };

  const getAnalysisTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      batch: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      individual: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      fallback: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getModelColor = (model: string) => {
    const colors: Record<string, string> = {
      'gemini-2.5-pro': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'gemini-2.5-flash': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'gemini-1.5-pro': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'gemini-1.5-flash': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[model] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  if (loading && offset === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Post Cost Analysis
          </h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {summary && (
              <span>
                {formatNumber(summary.totalAnalyses)} posts • {formatCurrency(summary.totalCost)} total
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Subreddit
            </label>
            <input
              type="text"
              value={filters.subreddit}
              onChange={(e) => updateFilter('subreddit', e.target.value)}
              placeholder="e.g., entrepreneur"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Model
            </label>
            <select
              value={filters.model}
              onChange={(e) => updateFilter('model', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Models</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Analysis Type
            </label>
            <select
              value={filters.analysisType}
              onChange={(e) => updateFilter('analysisType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="batch">Batch</option>
              <option value="individual">Individual</option>
              <option value="fallback">Fallback</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="createdAt">Date</option>
              <option value="totalCost">Cost</option>
              <option value="processingTime">Processing Time</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {summary.successRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Cost/Post</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(summary.averageCostPerPost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Opportunity Rate</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {summary.opportunityRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Processing</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {summary.averageProcessingTime}ms
              </p>
            </div>
          </div>
        )}

        {/* Posts Table */}
        {error || posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {error ? `Error: ${error}` : 'No posts found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Post
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Model & Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Results
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {post.postTitle}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          r/{post.subreddit} • {formatDateTime(post.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getModelColor(post.model)}`}>
                          {post.model.replace('gemini-', '')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAnalysisTypeColor(post.analysisType)}`}>
                          {post.analysisType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatTokens(post.totalTokens)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTokens(post.inputTokens)} in / {formatTokens(post.outputTokens)} out
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(post.totalCost)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(post.costPerToken)}/token
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {post.success ? (
                          <>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              post.isOpportunity 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {post.isOpportunity ? '✅ Opportunity' : '❌ No Opportunity'}
                            </span>
                            {post.confidence && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {(post.confidence * 100).toFixed(1)}% confidence
                              </div>
                            )}
                            {post.overallScore && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Score: {post.overallScore.toFixed(1)}/10
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            ⚠️ Error
                          </span>
                        )}
                        
                        {post.processingTime && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {post.processingTime}ms
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0 || loading}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {offset + 1}-{offset + posts.length} of {summary?.totalAnalyses || 0}
          </span>
          
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={!hasMore || loading}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}