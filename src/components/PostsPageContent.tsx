'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from './ui/Badge';
import { 
  Search, 
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
  isOpportunity: boolean | null;
  rejectionReasons: string[];
  aiConfidence: number | null;
  aiAnalysisDate: Date | null;
  commentAnalysisStatus: string | null;
  commentAnalysisJobId: string | null;
  commentAnalysisStarted: Date | null;
  commentAnalysisCompleted: Date | null;
  commentAnalysisError: string | null;
  commentOpportunitiesFound: number | null;
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
    opportunities?: number;
    rejected?: number;
  };
  subreddits: Array<{
    name: string;
    count: number;
  }>;
}

interface PostsPageContentProps {
  initialData?: PostsData;
}

export function PostsPageContent({ initialData }: PostsPageContentProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(!initialData);
  const [data, setData] = useState<PostsData | null>(initialData || null);
  const [analyzingComments, setAnalyzingComments] = useState<string | null>(null);
  
  // Filter state - managed client-side
  const [filters, setFilters] = useState({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    subreddit: searchParams.get('subreddit') || '',
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    author: searchParams.get('author') || '',
  });

  // Debounced search to avoid too many API calls
  const [searchInput, setSearchInput] = useState(filters.search);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch data from API
  const fetchData = useCallback(async (customFilters?: typeof filters) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      const currentFilters = customFilters || filters;
      
      // Add non-empty filters to query params
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.set(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/posts?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial data fetch
  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData, fetchData]);

  // Update URL without navigation when filters change
  const updateURL = useCallback((newFilters: typeof filters) => {
    const queryParams = new URLSearchParams();
    
    // Add non-empty filters to query params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '' && !(key === 'page' && value === 1)) {
        queryParams.set(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    const newPath = `/posts${queryString ? '?' + queryString : ''}`;
    
    // Update URL without navigation
    window.history.replaceState({}, '', newPath);
  }, []);

  // Update filters and fetch data
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    const updatedFilters = {
      ...filters,
      ...newFilters,
    };

    // Always reset to page 1 when changing filters (except for page navigation)
    if (!('page' in newFilters)) {
      updatedFilters.page = 1;
    }

    setFilters(updatedFilters);
    updateURL(updatedFilters);
    fetchData(updatedFilters);
  }, [filters, updateURL, fetchData]);

  // Handle search input with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      updateFilters({ search: value });
    }, 300); // 300ms debounce
    
    setSearchTimeout(timeout);
  }, [searchTimeout, updateFilters]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleAnalyzeComments = async (postId: string, permalink: string) => {
    if (!permalink) {
      alert('No Reddit permalink available for this post');
      return;
    }

    setAnalyzingComments(postId);
    try {
      const response = await fetch('/api/analyze-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          permalink,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Comments analysis started! Job ID: ${result.jobId}`);
        // Refresh the posts data to show updated status
        await fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error analyzing comments:', error);
      alert('Failed to start comment analysis');
    } finally {
      setAnalyzingComments(null);
    }
  };

  const getCommentAnalysisStatus = (post: RedditPost) => {
    const status = post.commentAnalysisStatus;
    if (status === 'processing') {
      return {
        disabled: true,
        buttonText: 'Analyzing...',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        className: 'bg-blue-500 text-white cursor-not-allowed',
      };
    } else if (status === 'completed') {
      return {
        disabled: false,
        buttonText: `Results (${post.commentOpportunitiesFound || 0})`,
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'bg-green-500 text-white hover:bg-green-600',
      };
    } else if (status === 'failed') {
      return {
        disabled: false,
        buttonText: 'Retry',
        icon: <XCircle className="w-4 h-4" />,
        className: 'bg-red-500 text-white hover:bg-red-600',
      };
    } else {
      return {
        disabled: false,
        buttonText: 'Analyze Comments',
        icon: <MessageSquare className="w-4 h-4" />,
        className: 'bg-blue-500 text-white hover:bg-blue-600',
      };
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };


  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading Reddit posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reddit Posts</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Scraped posts from Reddit with AI analysis and opportunity detection
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Posts</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.stats.total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Processed</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.stats.processed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unprocessed</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {data.stats.unprocessed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Opportunities</h3>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {(data.stats.opportunities || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <select
                  value={filters.subreddit}
                  onChange={(e) => updateFilters({ subreddit: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Subreddits</option>
                  {data.subreddits.map(sub => (
                    <option key={sub.name} value={sub.name}>
                      r/{sub.name} ({sub.count})
                    </option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="processed">Processed</option>
                  <option value="unprocessed">Unprocessed</option>
                  <option value="failed">Failed</option>
                  <option value="opportunity">Opportunities</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="createdUtc">Reddit Date</option>
                  <option value="score">Score</option>
                  <option value="numComments">Comments</option>
                </select>

                <select
                  value={filters.sortOrder}
                  onChange={(e) => updateFilters({ sortOrder: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area with Loading State */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-10 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">Loading posts...</p>
              </div>
            </div>
          )}

          {/* Posts Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8">
            {data.posts.map((post) => {
              const analysisStatus = getCommentAnalysisStatus(post);
              
              return (
                <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline">r/{post.subreddit}</Badge>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            <User className="w-4 h-4 inline mr-1" />
                            u/{post.author}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {formatDate(post.createdUtc)}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          <Link
                            href={`/posts/${post.id}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {post.title}
                          </Link>
                        </h3>

                        {post.content && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                            {post.content}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <ArrowBigUp className="w-4 h-4 mr-1" />
                            {post.score}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {post.numComments} comments
                          </span>
                          {post.permalink && (
                            <a
                              href={formatRedditUrl(post.permalink) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Reddit
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        {/* Processing Status */}
                        {post.isOpportunity === true && (
                          <Badge variant="success">Opportunity</Badge>
                        )}
                        {post.isOpportunity === false && (
                          <Badge variant="error">Rejected</Badge>
                        )}
                        {post.isOpportunity === null && (
                          <Badge variant="default">Unprocessed</Badge>
                        )}

                        {/* Comment Analysis Button */}
                        <button
                          onClick={() => handleAnalyzeComments(post.id, post.permalink || '')}
                          disabled={analysisStatus.disabled || analyzingComments === post.id}
                          className={`px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-2 ${analysisStatus.className}`}
                        >
                          {analyzingComments === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            analysisStatus.icon
                          )}
                          <span>{analysisStatus.buttonText}</span>
                        </button>
                      </div>
                    </div>

                    {/* Opportunity Details */}
                    {post.opportunitySources && post.opportunitySources.length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                          Opportunities Found:
                        </h4>
                        <div className="space-y-2">
                          {post.opportunitySources.map((source) => (
                            <div key={source.id} className="flex items-center justify-between">
                              <Link
                                href={`/opportunities/${source.opportunity.id}`}
                                className="text-sm text-green-700 dark:text-green-300 hover:underline"
                              >
                                {source.opportunity.title}
                              </Link>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-green-600 dark:text-green-400">
                                  Score: {source.opportunity.overallScore}
                                </span>
                                <Badge variant={source.opportunity.viabilityThreshold ? "success" : "default"}>
                                  {source.opportunity.viabilityThreshold ? "Viable" : "Monitor"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
                  disabled={!data.pagination.hasPrev}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => updateFilters({ page: filters.page + 1 })}
                  disabled={!data.pagination.hasNext}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({data.pagination.totalCount} total posts)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}