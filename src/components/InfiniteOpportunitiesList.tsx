'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { OpportunityCard } from './OpportunityCard';
import { FilterPanel } from './FilterPanel';
import { Loader2, ChevronUp, Search, Filter, TrendingUp, Sparkles, X } from 'lucide-react';
import debounce from 'lodash/debounce';
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
  sourceCount?: number;
  niche?: string | null;
  businessType?: string | null;
  platform?: string | null;
  targetAudience?: string | null;
  redditPosts?: Array<{
    id: string;
    sourceType: string;
    confidence: number;
    redditPost: {
      id: string;
      title: string;
      author: string;
      score: number;
      upvotes?: number;
      downvotes?: number;
      numComments: number;
      permalink: string | null;
      subreddit: string;
      createdUtc: Date;
    };
  }>;
  // Keep old structure for backward compatibility
  redditPost?: {
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
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<{
    subreddits: string[];
    niches: string[];
    businessTypes: string[];
    platforms: string[];
    targetAudiences: string[];
    industryVerticals: string[];
    developmentComplexities: string[];
    capitalRequirements: string[];
    marketTrends: string[];
  } | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  // Parse current filters from URL
  const currentFilters = useMemo(() => ({
    search: searchParams.get('search') || '',
    subreddit: searchParams.get('subreddit') || '',
    niche: searchParams.get('niche') || '',
    businessType: searchParams.get('businessType') || '',
    platform: searchParams.get('platform') || '',
    targetAudience: searchParams.get('targetAudience') || '',
    industryVertical: searchParams.get('industryVertical') || '',
    minScore: parseFloat(searchParams.get('minScore') || '0'),
    viability: searchParams.get('viability') || 'all',
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
        setOpportunities(prev => {
          // Create a Map to deduplicate by ID
          const opportunityMap = new Map();
          
          // Add existing opportunities
          prev.forEach(opp => opportunityMap.set(opp.id, opp));
          
          // Add new opportunities (will overwrite if duplicate)
          data.opportunities.forEach(opp => opportunityMap.set(opp.id, opp));
          
          // Convert back to array
          return Array.from(opportunityMap.values());
        });
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

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/filters');
        if (response.ok) {
          const data = await response.json();
          setFilterOptions(data.filters);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };
    fetchFilterOptions();
  }, []);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      updateFilters({ search: value });
    }, 500),
    [updateFilters]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header Section with Glassmorphism */}
        <div className="mb-8 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl p-8 shadow-xl border border-white/20 dark:border-gray-700/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400 animate-pulse" />
                AI Opportunities
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Discover and explore AI-powered business opportunities from Reddit communities
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 px-4 py-3 rounded-xl border border-white/20 dark:border-gray-600/20">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {Object.values(currentFilters).some(v => v !== '' && v !== 0 && v !== 'all' && v !== 'score' && v !== 'desc') ? 'Filtered' : 'Total Found'}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  ) : (
                    <>
                      {totalCount}
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </>
                  )}
                </div>
              </div>
              <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 px-4 py-3 rounded-xl border border-white/20 dark:border-gray-600/20">
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

          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-hover:text-purple-600" />
              <input
                type="text"
                placeholder="Search opportunities, technologies, or ideas..."
                value={searchInput}
                onChange={handleSearchChange}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-700/90"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all duration-300"
            >
              <Filter className={`w-5 h-5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
              Filters
              {Object.values(currentFilters).filter(v => v && v !== 'all' && v !== 'score' && v !== 'desc' && v !== 0).length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                  {Object.values(currentFilters).filter(v => v && v !== 'all' && v !== 'score' && v !== 'desc' && v !== 0).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel with Glassmorphism */}
        {showFilters && filterOptions && (
          <div className="mb-6 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20 animate-slideDown">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterPanel
              filters={currentFilters}
              filterOptions={filterOptions}
              onFilterChange={updateFilters}
            />
          </div>
        )}

        {/* Opportunities List */}
        <div className="grid gap-6">
          {/* Loading state for initial load or filter changes */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl px-8 py-6 shadow-xl border border-white/20 dark:border-gray-700/20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mr-3" />
                <span className="text-gray-600 dark:text-gray-300 text-lg">Loading opportunities...</span>
              </div>
            </div>
          )}

          {/* Content when not loading */}
          {!loading && (
            <>
              {opportunities.length === 0 ? (
                <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl p-12 shadow-xl border border-white/20 dark:border-gray-700/20 text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No opportunities found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {Object.values(currentFilters).some(v => v !== '' && v !== 0 && v !== 'all' && v !== 'score' && v !== 'desc') ? 
                      'Try adjusting your search or filters' :
                      'Run the Reddit scraping to discover opportunities'
                    }
                  </p>
                  {Object.values(currentFilters).some(v => v !== '' && v !== 0 && v !== 'all' && v !== 'score' && v !== 'desc') && (
                    <button
                      onClick={() => updateFilters({ search: '', subreddit: '', niche: '', businessType: '', platform: '', targetAudience: '', industryVertical: '', minScore: 0, viability: 'all', sortBy: 'score', sortOrder: 'desc' })}
                      className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors shadow-lg"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Filter status */}
                  {Object.values(currentFilters).some(v => v !== '' && v !== 0 && v !== 'all' && v !== 'score' && v !== 'desc') && (
                    <div className="backdrop-blur-xl bg-blue-50/60 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200/20 dark:border-blue-700/20">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                          Showing {opportunities.length} of {totalCount} opportunities
                          {currentFilters.search && ` matching "${currentFilters.search}"`}
                          {currentFilters.subreddit && ` from r/${currentFilters.subreddit}`}
                          {currentFilters.minScore > 0 && ` with score ≥ ${currentFilters.minScore}`}
                        </div>
                        <button
                          onClick={() => updateFilters({ search: '', subreddit: '', niche: '', businessType: '', platform: '', targetAudience: '', industryVertical: '', minScore: 0, viability: 'all', sortBy: 'score', sortOrder: 'desc' })}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Opportunities */}
                  {opportunities.map((opportunity, index) => (
                    <div
                      key={opportunity.id}
                      className="transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 animate-fadeIn"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
                        <OpportunityCard opportunity={opportunity} />
                      </div>
                    </div>
                  ))}

                  {/* Load more button/indicator */}
                  {hasMore && (
                    <div className="text-center py-8">
                      {loadingMore ? (
                        <div className="inline-flex items-center gap-3 px-6 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                          <span className="text-gray-600 dark:text-gray-300">Loading more opportunities...</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleLoadMore}
                          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          Load More Opportunities
                        </button>
                      )}
                    </div>
                  )}

                  {/* End of results indicator */}
                  {!hasMore && opportunities.length > 0 && (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center gap-2 px-6 py-3 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <p className="text-gray-600 dark:text-gray-400">
                          You&apos;ve reached the end of the opportunities list!
                        </p>
                      </div>
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
            className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-50 transform hover:scale-110"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}