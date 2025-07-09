'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import qs from 'qs';
import Link from 'next/link';
import { Badge } from './ui/Badge';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  MessageSquare, 
  ArrowBigUp, 
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2
} from 'lucide-react';
import { formatRedditUrl } from '../lib/reddit-utils';

interface RedditPost {
  id: string;
  redditId: string;
  title: string;
  content: string | null;
  author: string;
  subreddit: string;
  score: number;
  upvotes: number;
  downvotes: number;
  numComments: number;
  permalink: string | null;
  createdUtc: Date;
  processedAt: Date | null;
  processingError: string | null;
  createdAt: Date;
  updatedAt: Date;
  opportunitySources: Array<{
    id: string;
    confidence: number;
    sourceType: string;
    opportunity: {
      id: string;
      title: string;
      overallScore: number;
      viabilityThreshold: boolean;
      createdAt: Date;
    };
  }>;
}

interface PostsData {
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
}

interface PostsPageContentProps {
  initialData: PostsData;
}

export function PostsPageContent({ initialData }: PostsPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get current filter values from URL
  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentLimit = parseInt(searchParams.get('limit') || '20');
  const currentSubreddit = searchParams.get('subreddit') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSortBy = searchParams.get('sortBy') || 'createdAt';
  const currentSortOrder = searchParams.get('sortOrder') || 'desc';
  const currentAuthor = searchParams.get('author') || '';

  // Navigation function that updates URL with query parameters
  const navigateWithParams = (newParams: Record<string, string | number | undefined>) => {
    setIsLoading(true);
    
    const currentQuery = qs.parse(searchParams.toString());
    const updatedQuery = {
      ...currentQuery,
      ...newParams,
    };

    // Remove undefined/empty values
    Object.keys(updatedQuery).forEach(key => {
      if (!updatedQuery[key] || updatedQuery[key] === '') {
        delete updatedQuery[key];
      }
    });

    // Always reset to page 1 when changing filters (except for page navigation)
    if (!('page' in newParams)) {
      updatedQuery.page = 1;
    }

    const queryString = qs.stringify(updatedQuery, { addQueryPrefix: true });
    router.push(`/posts${queryString}`);
  };

  // Reset loading state when navigation completes
  useEffect(() => {
    setIsLoading(false);
  }, [initialData]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProcessingStatus = (post: RedditPost) => {
    if (post.processingError) {
      return {
        status: 'failed',
        label: 'Failed',
        icon: <XCircle className="w-4 h-4" />,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
      };
    }
    if (post.processedAt) {
      return {
        status: 'processed',
        label: 'Processed',
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
      };
    }
    
    // Check if post was recently scraped but not yet processed
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (new Date(post.createdAt) > fiveMinutesAgo && !post.processedAt) {
      return {
        status: 'processing',
        label: 'Processing',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      };
    }
    
    return {
      status: 'unprocessed',
      label: 'Unprocessed',
      icon: <Clock className="w-4 h-4" />,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    };
  };

  const getOpportunityStats = (post: RedditPost) => {
    const opportunities = post.opportunitySources.map(src => src.opportunity);
    const viableCount = opportunities.filter(opp => opp.viabilityThreshold).length;
    return {
      total: opportunities.length,
      viable: viableCount,
      avgScore: opportunities.length > 0 
        ? opportunities.reduce((sum, opp) => sum + opp.overallScore, 0) / opportunities.length 
        : 0,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reddit Posts
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Browse and analyze Reddit posts for business opportunities
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {initialData.stats.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Posts</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {initialData.stats.processed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Processed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {initialData.stats.unprocessed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Unprocessed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {initialData.stats.failed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={currentSearch}
                  onChange={(e) => navigateWithParams({ search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Subreddit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subreddit
              </label>
              <select
                value={currentSubreddit}
                onChange={(e) => navigateWithParams({ subreddit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Subreddits</option>
                {initialData.subreddits.map((sub) => (
                  <option key={sub.name} value={sub.name}>
                    r/{sub.name} ({sub.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={currentStatus}
                onChange={(e) => navigateWithParams({ status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="processed">Processed</option>
                <option value="unprocessed">Unprocessed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Author */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Author
              </label>
              <input
                type="text"
                placeholder="Username"
                value={currentAuthor}
                onChange={(e) => navigateWithParams({ author: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </label>
              <select
                value={currentSortBy}
                onChange={(e) => navigateWithParams({ sortBy: e.target.value })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="createdAt">Date Scraped</option>
                <option value="createdUtc">Date Posted</option>
                <option value="score">Reddit Score</option>
                <option value="upvotes">Upvotes</option>
                <option value="numComments">Comments</option>
                <option value="title">Title</option>
                <option value="author">Author</option>
                <option value="subreddit">Subreddit</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Order:
              </label>
              <select
                value={currentSortOrder}
                onChange={(e) => navigateWithParams({ sortOrder: e.target.value })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Per page:
              </label>
              <select
                value={currentLimit}
                onChange={(e) => navigateWithParams({ limit: parseInt(e.target.value) })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-gray-900 dark:text-white">Loading posts...</span>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          {initialData.posts.map((post) => {
            const status = getProcessingStatus(post);
            const opportunities = getOpportunityStats(post);
            
            return (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">r/{post.subreddit}</Badge>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                        {opportunities.total > 0 && (
                          <Badge variant={opportunities.viable > 0 ? "success" : "warning"}>
                            {opportunities.total} idea{opportunities.total > 1 ? 's' : ''}
                            {opportunities.viable > 0 && ` (${opportunities.viable} viable)`}
                          </Badge>
                        )}
                      </div>
                      <Link
                        href={`/posts/${post.id}`}
                        className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {post.title}
                      </Link>
                      {post.content && (
                        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm line-clamp-2">
                          {post.content.substring(0, 200)}...
                        </p>
                      )}
                    </div>
                    {post.permalink && (
                      <a
                        href={formatRedditUrl(post.permalink) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Reddit
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <Link
                          href={`/posts?author=${post.author}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          u/{post.author}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.createdUtc)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <ArrowBigUp className="w-4 h-4 text-orange-500" />
                        <span>{post.score}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.numComments}</span>
                      </div>
                      {opportunities.total > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-green-600 dark:text-green-400">💡</span>
                          <span>{opportunities.avgScore.toFixed(1)}/10</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {post.processingError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-800 dark:text-red-200 text-sm">
                            Processing Error
                          </div>
                          <div className="text-red-700 dark:text-red-300 text-xs mt-1">
                            {post.processingError}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Opportunities Preview */}
                  {opportunities.total > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Generated Opportunities
                        </span>
                        <Link
                          href={`/posts/${post.id}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View all {opportunities.total}
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {post.opportunitySources.slice(0, 3).map((source) => (
                          <Link
                            key={source.id}
                            href={`/opportunities/${source.opportunity.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          >
                            {source.opportunity.viabilityThreshold && (
                              <span className="text-green-600 dark:text-green-400">✅</span>
                            )}
                            {source.opportunity.title}
                            <span className="text-blue-500 dark:text-blue-400">
                              ({source.opportunity.overallScore.toFixed(1)})
                            </span>
                          </Link>
                        ))}
                        {opportunities.total > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{opportunities.total - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {initialData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * currentLimit) + 1} to {Math.min(currentPage * currentLimit, initialData.pagination.totalCount)} of {initialData.pagination.totalCount} posts
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWithParams({ page: currentPage - 1 })}
                disabled={!initialData.pagination.hasPrev}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, initialData.pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={page}
                      onClick={() => navigateWithParams({ page })}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => navigateWithParams({ page: currentPage + 1 })}
                disabled={!initialData.pagination.hasNext}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}