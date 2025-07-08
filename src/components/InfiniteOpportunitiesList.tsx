'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityFilters } from './OpportunityFilters';
import { Loader2, ChevronUp } from 'lucide-react';
import qs from 'qs';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  currentSolution?: string | null;
  proposedSolution: string;
  marketContext?: string | null;
  implementationNotes?: string | null;
  speedScore: number;
  convenienceScore: number;
  trustScore: number;
  priceScore: number;
  statusScore: number;
  predictabilityScore: number;
  uiUxScore: number;
  easeOfUseScore: number;
  legalFrictionScore: number;
  emotionalComfortScore: number;
  overallScore: number;
  viabilityThreshold: boolean;
  subreddit: string;
  marketSize: string | null;
  complexity: string | null;
  successProbability: string | null;
  createdAt: Date;
  redditPost: {
    title: string;
    author: string;
    score: number;
    numComments: number;
    permalink: string | null;
  };
}

interface OpportunitiesResponse {
  opportunities: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: {
    search?: string;
    subreddit?: string;
    minScore?: number;
    sortBy?: 'score' | 'date' | 'subreddit';
    sortOrder?: 'asc' | 'desc';
  };
}

export function InfiniteOpportunitiesList() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse current filters from URL
  const currentFilters = useMemo(() => ({
    search: searchParams.get('search') || '',
    subreddit: searchParams.get('subreddit') || '',
    minScore: parseFloat(searchParams.get('minScore') || '0'),
    sortBy: (searchParams.get('sortBy') as 'score' | 'date' | 'subreddit') || 'score',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  }), [searchParams]);

  const fetchOpportunities = useCallback(async (page: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const queryParams = {
        ...currentFilters,
        page,
        limit: 20,
      };

      // Remove empty values
      const cleanedParams = Object.fromEntries(
        Object.entries(queryParams).filter(([, value]) => value !== '' && value !== 0)
      );

      const queryString = qs.stringify(cleanedParams, { addQueryPrefix: true });
      const response = await fetch(`/api/opportunities${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }

      const data: OpportunitiesResponse = await response.json();

      if (reset) {
        setOpportunities(data.opportunities);
        setCurrentPage(1);
      } else {
        setOpportunities(prev => [...prev, ...data.opportunities]);
      }

      setHasMore(data.pagination.hasMore);
      setTotalCount(data.pagination.totalCount);
      setCurrentPage(data.pagination.page);

    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentFilters]);

  // Initial load and reload when filters change
  useEffect(() => {
    fetchOpportunities(1, true);
  }, [fetchOpportunities]); // Depend on fetchOpportunities to trigger reload when filters change

  // Infinite scroll handler
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchOpportunities(currentPage + 1, false);
    }
  }, [loadingMore, hasMore, currentPage, fetchOpportunities]);

  // Scroll event handler for infinite scroll and scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      // Show scroll-to-top button when scrolled down
      setShowScrollTop(window.scrollY > 400);

      // Infinite scroll trigger
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 &&
        !loadingMore &&
        hasMore
      ) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, handleLoadMore]);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update URL when filters change
  const updateFilters = useCallback((newFilters: Partial<typeof currentFilters>) => {
    const updatedFilters = { ...currentFilters, ...newFilters };
    
    // Remove empty values
    const cleanedFilters = Object.fromEntries(
      Object.entries(updatedFilters).filter(([, value]) => value !== '' && value !== 0)
    );

    const queryString = qs.stringify(cleanedFilters, { addQueryPrefix: true });
    router.push(`/opportunities${queryString}`);
  }, [currentFilters, router]);

  const viableOpportunities = opportunities.filter(opp => opp.viabilityThreshold);

  // Remove the full page loading screen - we'll handle it differently

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchOpportunities(1, true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🎯 AI Opportunities Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Discover validated business opportunities from Reddit discussions
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {Object.values(currentFilters).some(v => v !== '' && v !== 0) ? 'Filtered' : 'Total Found'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                ) : (
                  totalCount
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Viable (4+ Score)</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                ) : (
                  viableOpportunities.length
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <OpportunityFilters
          initialSearch={currentFilters.search}
          initialSubreddit={currentFilters.subreddit}
          initialMinScore={currentFilters.minScore}
          initialSortBy={currentFilters.sortBy}
          initialSortOrder={currentFilters.sortOrder}
          onFiltersChange={updateFilters}
        />

        {/* Opportunities List */}
        <div className="grid gap-6 mt-8">
          {/* Loading state for initial load or filter changes */}
          {loading && (
            <div className="text-center py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                <span className="text-gray-600 dark:text-gray-300 text-lg">Loading opportunities...</span>
              </div>
            </div>
          )}

          {/* Content when not loading */}
          {!loading && (
            <>
              {opportunities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 dark:text-gray-400 text-lg">
                    {Object.values(currentFilters).some(v => v !== '' && v !== 0) ? 
                      'No opportunities match your filters. Try adjusting your search criteria.' :
                      'No opportunities found yet. Try running the Reddit scraping to discover opportunities!'
                    }
                  </div>
                  {Object.values(currentFilters).some(v => v !== '' && v !== 0) && (
                    <button
                      onClick={() => updateFilters({ search: '', subreddit: '', minScore: 0, sortBy: 'score', sortOrder: 'desc' })}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Filter status */}
                  {Object.values(currentFilters).some(v => v !== '' && v !== 0) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                          Showing {opportunities.length} of {totalCount} opportunities
                          {currentFilters.search && ` matching "${currentFilters.search}"`}
                          {currentFilters.subreddit && ` from r/${currentFilters.subreddit}`}
                          {currentFilters.minScore > 0 && ` with score ≥ ${currentFilters.minScore}`}
                        </div>
                        <button
                          onClick={() => updateFilters({ search: '', subreddit: '', minScore: 0, sortBy: 'score', sortOrder: 'desc' })}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Opportunities */}
                  {opportunities.map((opportunity) => (
                    <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                  ))}

                  {/* Load more button/indicator */}
                  {hasMore && (
                    <div className="text-center py-8">
                      {loadingMore ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                          <span className="text-gray-600 dark:text-gray-300">Loading more opportunities...</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleLoadMore}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                        >
                          Load More Opportunities
                        </button>
                      )}
                    </div>
                  )}

                  {/* End of results indicator */}
                  {!hasMore && opportunities.length > 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        You&apos;ve reached the end of the opportunities list!
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Scroll to top button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}