import Link from 'next/link';
import { OpportunityCard } from './OpportunityCard';
import { Pagination } from './ui/Pagination';
import { 
  Search, 
  Filter, 
  Sparkles,
  TrendingUp
} from 'lucide-react';

import type { AppRouter } from '@/server/api/root';

interface OpportunitiesPageSSRProps {
  data: Awaited<ReturnType<AppRouter['opportunities']['list']>>;
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    subreddit?: string;
    businessType?: string;
    platform?: string;
    targetAudience?: string;
    industryVertical?: string;
    niche?: string;
    minScore?: string;
    viability?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export function OpportunitiesPageSSR({ data, searchParams }: OpportunitiesPageSSRProps) {
  // Extract current filter values from searchParams
  const currentFilters = {
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '20'),
    search: searchParams.search || '',
    subreddit: searchParams.subreddit || '',
    businessType: searchParams.businessType || '',
    platform: searchParams.platform || '',
    targetAudience: searchParams.targetAudience || '',
    industryVertical: searchParams.industryVertical || '',
    niche: searchParams.niche || '',
    minScore: parseFloat(searchParams.minScore || '0'),
    viability: searchParams.viability || 'all',
    sortBy: searchParams.sortBy || 'overallScore',
    sortOrder: searchParams.sortOrder || 'desc',
  };

  // Count active filters
  const activeFiltersCount = [
    currentFilters.search,
    currentFilters.subreddit,
    currentFilters.businessType,
    currentFilters.platform,
    currentFilters.targetAudience,
    currentFilters.industryVertical,
    currentFilters.niche,
    currentFilters.minScore > 0 ? 'minScore' : '',
    currentFilters.viability !== 'all' ? 'viability' : '',
  ].filter(Boolean).length;

  // Helper function to create URLs with updated filters
  const createFilterUrl = (newFilters: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const allFilters = { ...currentFilters, ...newFilters };
    
    // Reset to page 1 when changing filters (except for page navigation)
    if (!('page' in newFilters)) {
      allFilters.page = 1;
    }
    
    // Add non-empty filters to params
    Object.entries(allFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && !(key === 'page' && value === 1) && !(key === 'minScore' && value === 0)) {
        params.set(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    return `/opportunities${queryString ? '?' + queryString : ''}`;
  };

  // Helper function for pagination URLs
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    const allFilters = { ...currentFilters, page };
    
    // Add non-empty filters to params
    Object.entries(allFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && !(key === 'page' && value === 1) && !(key === 'minScore' && value === 0)) {
        params.set(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    return `/opportunities${queryString ? '?' + queryString : ''}`;
  };

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
                  {activeFiltersCount > 0 ? 'Filtered' : 'Total Found'}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {data.pagination.totalCount}
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 px-4 py-3 rounded-xl border border-white/20 dark:border-gray-600/20">
                <div className="text-sm text-gray-600 dark:text-gray-400">Viable (4+ Score)</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.stats.viable}
                </div>
              </div>
              <div className="backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 px-4 py-3 rounded-xl border border-white/20 dark:border-gray-600/20">
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Score</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.stats.avgScore.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-hover:text-purple-600" />
              <form action="/opportunities" method="GET">
                {/* Preserve all current filters */}
                {Object.entries(currentFilters).map(([key, value]) => {
                  if (key !== 'search' && value && value !== '' && !(key === 'page' && value === 1) && !(key === 'minScore' && value === 0)) {
                    return <input key={key} type="hidden" name={key} value={value.toString()} />;
                  }
                  return null;
                })}
                <input
                  type="text"
                  name="search"
                  placeholder="Search opportunities, technologies, or ideas..."
                  defaultValue={currentFilters.search}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 hover:bg-white/90 dark:hover:bg-gray-700/90"
                />
              </form>
            </div>
            <Link
              href={createFilterUrl({})}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all duration-300"
            >
              <Filter className="w-5 h-5" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Filter status */}
        {activeFiltersCount > 0 && (
          <div className="mb-6 backdrop-blur-xl bg-blue-50/60 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200/20 dark:border-blue-700/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Showing {data.opportunities.length} of {data.pagination.totalCount} opportunities
                {currentFilters.search && ` matching "${currentFilters.search}"`}
                {currentFilters.subreddit && ` from r/${currentFilters.subreddit}`}
                {currentFilters.minScore > 0 && ` with score ≥ ${currentFilters.minScore}`}
              </div>
              <Link
                href="/opportunities"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </Link>
            </div>
          </div>
        )}

        {/* Opportunities List */}
        <div className="space-y-6">
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
                <Link
                  href="/opportunities"
                  className="mt-4 inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors shadow-lg"
                >
                  Clear All Filters
                </Link>
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
                currentPage={currentFilters.page}
                totalPages={data.pagination.totalPages}
                totalCount={data.pagination.totalCount}
                itemsPerPage={currentFilters.limit}
                createPageUrl={createPageUrl}
                className="backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20"
              />
            </div>
          )}
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