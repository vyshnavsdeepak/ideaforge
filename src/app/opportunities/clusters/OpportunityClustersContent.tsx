'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Globe, 
  BarChart3, 
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Hash,
  Clock,
  Target,
  Zap,
  Filter
} from 'lucide-react';
import Link from 'next/link';

interface OpportunityCluster {
  id: string;
  title: string;
  description: string;
  sourceCount: number;
  opportunityCount: number;
  avgScore: number;
  viabilityRate: number;
  subreddits: string[];
  trendingScore: number;
  firstSeen: string;
  lastSeen: string;
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    overallScore: number;
    viabilityThreshold: boolean;
    subreddit: string;
    sourceCount: number;
    createdAt: string;
    redditPostCount: number;
  }>;
  topRedditPosts: Array<{
    id: string;
    title: string;
    author: string;
    score: number;
    subreddit: string;
    createdUtc: string;
  }>;
}

interface ClusteringSummary {
  totalClusters: number;
  totalOpportunities: number;
  avgClusterSize: number;
  topNiches: Array<{
    niche: string;
    count: number;
    avgScore: number;
  }>;
  crossSubredditClusters: number;
  highViabilityClusters: number;
  filteredClusters: number;
  totalSources: number;
  avgTrendingScore: number;
}

export function OpportunityClustersContent() {
  const [clusters, setClusters] = useState<OpportunityCluster[]>([]);
  const [summary, setSummary] = useState<ClusteringSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    minSources: 2,
    minViability: 0,
    sortBy: 'trending' as 'trending' | 'sources' | 'viability' | 'score',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchClusters = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        minSources: filters.minSources.toString(),
      });

      const response = await fetch(`/api/opportunities/clusters?${params}`);
      if (!response.ok) throw new Error('Failed to fetch clusters');
      
      const data = await response.json();
      setClusters(data.clusters);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching clusters:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters.minSources]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger clustering recalculation
      const response = await fetch('/api/opportunities/clusters', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Refetch data after recalculation
        await fetchClusters();
      }
    } catch (error) {
      console.error('Error refreshing clusters:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleCluster = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const sortedClusters = [...clusters].sort((a, b) => {
    switch (filters.sortBy) {
      case 'trending':
        return b.trendingScore - a.trendingScore;
      case 'sources':
        return b.sourceCount - a.sourceCount;
      case 'viability':
        return b.viabilityRate - a.viabilityRate;
      case 'score':
        return b.avgScore - a.avgScore;
      default:
        return b.trendingScore - a.trendingScore;
    }
  }).filter(cluster => cluster.viabilityRate >= filters.minViability);

  const getTrendingColor = (score: number) => {
    if (score >= 80) return 'text-red-600 dark:text-red-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getViabilityColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400';
    if (rate >= 60) return 'text-blue-600 dark:text-blue-400';
    if (rate >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading opportunity clusters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
                Opportunity Clusters
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Discover similar opportunities and frequently requested ideas from Reddit communities
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Analyzing...' : 'Refresh Analysis'}
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Sources: {filters.minSources}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={filters.minSources}
                    onChange={(e) => setFilters(prev => ({ ...prev, minSources: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Viability: {filters.minViability}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minViability}
                    onChange={(e) => setFilters(prev => ({ ...prev, minViability: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as 'trending' | 'sources' | 'viability' | 'score' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="trending">Trending Score</option>
                    <option value="sources">Source Count</option>
                    <option value="viability">Viability Rate</option>
                    <option value="score">Average Score</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Clusters</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {summary.totalClusters}
                    </p>
                  </div>
                  <Hash className="w-8 h-8 text-blue-600 opacity-20" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cross-Subreddit</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {summary.crossSubredditClusters}
                    </p>
                  </div>
                  <Globe className="w-8 h-8 text-green-600 opacity-20" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">High Viability</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {summary.highViabilityClusters}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-purple-600 opacity-20" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Trending</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round(summary.avgTrendingScore)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-600 opacity-20" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clusters List */}
        <div className="space-y-6">
          {sortedClusters.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center shadow">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No opportunity clusters found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your filters or refresh the analysis
              </p>
            </div>
          ) : (
            sortedClusters.map((cluster) => (
              <div key={cluster.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {cluster.title}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTrendingColor(cluster.trendingScore)}`}>
                          <TrendingUp className="w-3 h-3" />
                          {cluster.trendingScore}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {cluster.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span>{cluster.sourceCount} sources</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash className="w-4 h-4 text-green-600" />
                          <span>{cluster.opportunityCount} opportunities</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          <span>{cluster.avgScore}/10 avg score</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className={`w-4 h-4 ${getViabilityColor(cluster.viabilityRate)}`} />
                          <span className={getViabilityColor(cluster.viabilityRate)}>
                            {cluster.viabilityRate}% viable
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCluster(cluster.id)}
                      className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {expandedClusters.has(cluster.id) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Subreddit tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {cluster.subreddits.map((subreddit) => (
                      <span
                        key={subreddit}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        r/{subreddit}
                      </span>
                    ))}
                  </div>

                  {/* Time info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>First: {new Date(cluster.firstSeen).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Latest: {new Date(cluster.lastSeen).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedClusters.has(cluster.id) && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Opportunities */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Related Opportunities ({cluster.opportunities.length})
                          </h4>
                          <div className="space-y-2">
                            {cluster.opportunities.slice(0, 5).map((opportunity) => (
                              <Link
                                key={opportunity.id}
                                href={`/opportunities/${opportunity.id}`}
                                className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                                      {opportunity.title}
                                    </h5>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {opportunity.description}
                                    </p>
                                  </div>
                                  <div className="ml-2 flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      {opportunity.overallScore.toFixed(1)}
                                    </span>
                                    {opportunity.viabilityThreshold && (
                                      <span className="text-xs text-green-600">✓</span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            ))}
                            {cluster.opportunities.length > 5 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                ... and {cluster.opportunities.length - 5} more
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Top Reddit Posts */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Top Source Posts ({cluster.topRedditPosts.length})
                          </h4>
                          <div className="space-y-2">
                            {cluster.topRedditPosts.map((post) => (
                              <div
                                key={post.id}
                                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                                      {post.title}
                                    </h5>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      <span>u/{post.author}</span>
                                      <span>•</span>
                                      <span>r/{post.subreddit}</span>
                                      <span>•</span>
                                      <span>{post.score} points</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}