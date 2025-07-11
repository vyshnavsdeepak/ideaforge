'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { OpportunityCard } from './OpportunityCard';
import { Pagination } from './ui/Pagination';
import { 
  Search, 
  Filter, 
  Sparkles,
  TrendingUp,
  X,
  Loader2
} from 'lucide-react';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  currentSolution: string | null;
  proposedSolution: string;
  marketContext: string | null;
  implementationNotes: string | null;
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
  businessType: string | null;
  businessModel: string | null;
  revenueModel: string | null;
  platform: string | null;
  targetAudience: string | null;
  industryVertical: string | null;
  niche: string | null;
  createdAt: Date;
  updatedAt: Date;
  redditPosts: Array<{
    id: string;
    sourceType: string;
    confidence: number;
    redditPost: {
      id: string;
      title: string;
      author: string;
      score: number;
      upvotes: number;
      downvotes: number;
      numComments: number;
      permalink: string | null;
      subreddit: string;
      createdUtc: Date;
    };
  }>;
}

interface OpportunitiesData {
  opportunities: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats: {
    total: number;
    viable: number;
    avgScore: number;
  };
  filters: {
    subreddits: string[];
    businessTypes: string[];
    platforms: string[];
    targetAudiences: string[];
    industryVerticals: string[];
    niches: string[];
  };
}

interface OpportunitiesPageContentProps {
  initialData?: OpportunitiesData;
}

export function OpportunitiesPageContent({ initialData }: OpportunitiesPageContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(!initialData);
  const [data, setData] = useState<OpportunitiesData | null>(initialData || null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state - derived from URL searchParams
  const filters = useMemo(() => ({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    search: searchParams.get('search') || '',
    subreddit: searchParams.get('subreddit') || '',
    businessType: searchParams.get('businessType') || '',
    platform: searchParams.get('platform') || '',
    targetAudience: searchParams.get('targetAudience') || '',
    industryVertical: searchParams.get('industryVertical') || '',
    niche: searchParams.get('niche') || '',
    minScore: parseFloat(searchParams.get('minScore') || '0'),
    viability: searchParams.get('viability') || 'all',
    sortBy: searchParams.get('sortBy') || 'overallScore',
    sortOrder: searchParams.get('sortOrder') || 'desc',
  }), [searchParams]);

  // Debounced search to avoid too many API calls
  const [searchInput, setSearchInput] = useState(filters.search);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Update searchInput when URL search parameter changes
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Fetch data from API
  const fetchData = useCallback(async (customFilters?: typeof filters) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      const currentFilters = customFilters || filters;
      
      // Add non-empty filters to query params
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && !(key === 'page' && value === 1) && !(key === 'minScore' && value === 0)) {
          queryParams.set(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/opportunities?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
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

  // Fetch data when URL parameters change
  useEffect(() => {
    if (initialData) {
      // If we have initial data, fetch new data when URL changes
      fetchData();
    }
  }, [filters, fetchData, initialData]);


  // Update filters using router navigation
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    const updatedFilters = {
      ...filters,
      ...newFilters,
    };

    // Always reset to page 1 when changing filters (except for page navigation)
    if (!('page' in newFilters)) {
      updatedFilters.page = 1;
    }

    // Create new URL with updated filters
    const queryParams = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && !(key === 'page' && value === 1) && !(key === 'minScore' && value === 0)) {
        queryParams.set(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    const newPath = `/opportunities${queryString ? '?' + queryString : ''}`;
    
    // Navigate to new URL (this will trigger re-render with new data)
    router.push(newPath);
  }, [filters, router]);

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
    }, 500); // 500ms debounce
    
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.subreddit) count++;
    if (filters.businessType) count++;
    if (filters.platform) count++;
    if (filters.targetAudience) count++;
    if (filters.industryVertical) count++;
    if (filters.niche) count++;
    if (filters.minScore > 0) count++;
    if (filters.viability !== 'all') count++;
    return count;
  }, [filters]);

  const clearAllFilters = () => {
    setSearchInput('');
    updateFilters({
      search: '',
      subreddit: '',
      businessType: '',
      platform: '',
      targetAudience: '',
      industryVertical: '',
      niche: '',
      minScore: 0,
      viability: 'all',
      sortBy: 'overallScore',
      sortOrder: 'desc',
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading opportunities...</p>
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
        <div className="mb-8 backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20 dark:border-gray-700/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 dark:text-purple-400 animate-pulse" />
                AI Opportunities
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
                Discover and explore AI-powered business opportunities from Reddit communities
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:flex lg:items-center">
              <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 px-2 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 dark:border-gray-600/20">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {activeFiltersCount > 0 ? 'Filtered' : 'Total Found'}
                </div>
                <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1 sm:gap-2">
                  {data.pagination.totalCount}
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                </div>
              </div>
              <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 px-2 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 dark:border-gray-600/20">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Viable (4+ Score)</div>
                <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.stats.viable}
                </div>
              </div>
              <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 px-2 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 dark:border-gray-600/20">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Avg Score</div>
                <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.stats.avgScore.toFixed(1)}
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
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-700/90"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all duration-300"
            >
              <Filter className={`w-5 h-5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && !isLoading && (
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Subreddit Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subreddit
                </label>
                <select
                  value={filters.subreddit}
                  onChange={(e) => updateFilters({ subreddit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Subreddits</option>
                  {data.filters.subreddits.map((sub) => (
                    <option key={sub} value={sub}>
                      r/{sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Type
                </label>
                <select
                  value={filters.businessType}
                  onChange={(e) => updateFilters({ businessType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Types</option>
                  {data.filters.businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Platform Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Platform
                </label>
                <select
                  value={filters.platform}
                  onChange={(e) => updateFilters({ platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Platforms</option>
                  {data.filters.platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Audience Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience
                </label>
                <select
                  value={filters.targetAudience}
                  onChange={(e) => updateFilters({ targetAudience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Audiences</option>
                  {data.filters.targetAudiences.map((audience) => (
                    <option key={audience} value={audience}>
                      {audience}
                    </option>
                  ))}
                </select>
              </div>

              {/* Industry Vertical Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industry
                </label>
                <select
                  value={filters.industryVertical}
                  onChange={(e) => updateFilters({ industryVertical: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Industries</option>
                  {data.filters.industryVerticals.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              {/* Niche Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Niche
                </label>
                <select
                  value={filters.niche}
                  onChange={(e) => updateFilters({ niche: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Niches</option>
                  {data.filters.niches.map((niche) => (
                    <option key={niche} value={niche}>
                      {niche}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Score Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Score: {filters.minScore.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={filters.minScore}
                  onChange={(e) => updateFilters({ minScore: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Viability Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Viability
                </label>
                <select
                  value={filters.viability}
                  onChange={(e) => updateFilters({ viability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Opportunities</option>
                  <option value="viable">Viable Only</option>
                  <option value="not_viable">Not Viable</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort by:
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value })}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="overallScore">Overall Score</option>
                  <option value="createdAt">Date Created</option>
                  <option value="title">Title</option>
                  <option value="subreddit">Subreddit</option>
                  <option value="businessType">Business Type</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Order:
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => updateFilters({ sortOrder: e.target.value })}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  value={filters.limit}
                  onChange={(e) => updateFilters({ limit: parseInt(e.target.value) })}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results with Loading Overlay */}
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-10 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">Loading opportunities...</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Filter status */}
            {activeFiltersCount > 0 && (
              <div className="backdrop-blur-xl bg-blue-50/60 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200/20 dark:border-blue-700/20">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    Showing {data.opportunities.length} of {data.pagination.totalCount} opportunities
                    {filters.search && ` matching "${filters.search}"`}
                    {filters.subreddit && ` from r/${filters.subreddit}`}
                    {filters.minScore > 0 && ` with score ≥ ${filters.minScore}`}
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}

            {/* Opportunities List */}
            {data.opportunities.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl p-12 shadow-xl border border-white/20 dark:border-gray-700/20 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No opportunities found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {activeFiltersCount > 0 ? 
                    'Try adjusting your search or filters' :
                    'Run the Reddit scraping to discover opportunities'
                  }
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors shadow-lg"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {data.opportunities.map((opportunity, index) => (
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
              </>
            )}

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={filters.page}
                  totalPages={data.pagination.totalPages}
                  totalCount={data.pagination.totalCount}
                  itemsPerPage={filters.limit}
                  createPageUrl={(page) => {
                    const queryParams = new URLSearchParams();
                    const newFilters = { ...filters, page };
                    
                    // Add non-empty filters to query params
                    Object.entries(newFilters).forEach(([key, value]) => {
                      if (value !== undefined && value !== null && value !== '' && !(key === 'page' && value === 1) && !(key === 'minScore' && value === 0)) {
                        queryParams.set(key, value.toString());
                      }
                    });
                    
                    const queryString = queryParams.toString();
                    return `/opportunities${queryString ? '?' + queryString : ''}`;
                  }}
                  className="backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20"
                />
              </div>
            )}
          </div>
        </div>
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