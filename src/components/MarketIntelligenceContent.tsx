'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Lightbulb,
  Calendar,
  BarChart3,
  Search,
  ChevronRight,
  Hash,
  Globe,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Badge } from './ui/Badge';

interface MarketDemandCluster {
  id: string;
  niche: string;
  demandSignal: string;
  occurrenceCount: number;
  subreddits: string[];
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  opportunities: Array<{
    id: string;
    opportunity: {
      id: string;
      title: string;
      overallScore: number;
      viabilityThreshold: boolean;
    };
  }>;
}

interface MarketIntelligenceData {
  clusters: MarketDemandCluster[];
  stats: {
    totalClusters: number;
    totalSignals: number;
    activeNiches: number;
    topSubreddits: Array<{
      name: string;
      count: number;
    }>;
  };
  trends: {
    growingDemands: Array<{
      niche: string;
      growthRate: number;
      currentCount: number;
    }>;
    emergingNiches: string[];
  };
}

export function MarketIntelligenceContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<MarketIntelligenceData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [sortBy, setSortBy] = useState<'occurrences' | 'recent' | 'opportunities'>('occurrences');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedNiche) params.append('niche', selectedNiche);
      params.append('sortBy', sortBy);

      const response = await fetch(`/api/market-intelligence?${params}`);
      if (!response.ok) throw new Error('Failed to fetch market intelligence');
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching market intelligence:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedNiche, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/market-intelligence/refresh', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to refresh market intelligence');
      
      // Refetch data after refresh
      await fetchData();
    } catch (error) {
      console.error('Error refreshing market intelligence:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading market intelligence...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No market intelligence data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                Market Demand Intelligence
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Discover recurring market demands and trending opportunities
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Analysis
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Clusters</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.stats.totalClusters}
                  </p>
                </div>
                <Hash className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Demand Signals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.stats.totalSignals}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Niches</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.stats.activeNiches}
                  </p>
                </div>
                <Lightbulb className="w-8 h-8 text-yellow-600 opacity-20" />
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Top Subreddit</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    r/{data.stats.topSubreddits[0]?.name || 'N/A'}
                  </p>
                </div>
                <Globe className="w-8 h-8 text-purple-600 opacity-20" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search demand signals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Niches</option>
                {Array.from(new Set(data.clusters.map(c => c.niche))).map(niche => (
                  <option key={niche} value={niche}>{niche}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="occurrences">Most Occurrences</option>
                <option value="recent">Most Recent</option>
                <option value="opportunities">Most Opportunities</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trending Section */}
        {data.trends.growingDemands.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Growing Demands
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.trends.growingDemands.slice(0, 6).map((trend, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{trend.niche}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {trend.currentCount} signals
                      </p>
                    </div>
                    <Badge variant="success">
                      +{trend.growthRate}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Demand Clusters */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Demand Clusters
          </h2>
          <div className="space-y-4">
            {data.clusters.map((cluster) => (
              <div key={cluster.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">{cluster.niche}</Badge>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          <Users className="w-3 h-3" />
                          {cluster.occurrenceCount} occurrences
                        </span>
                        {cluster.opportunities.length > 0 && (
                          <Badge variant="success">
                            {cluster.opportunities.length} opportunities
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {cluster.demandSignal}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          <span>{cluster.subreddits.map(s => `r/${s}`).join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Last seen: {formatDate(cluster.lastSeen)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Related Opportunities */}
                  {cluster.opportunities.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Related Opportunities
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cluster.opportunities.map((opp) => (
                          <Link
                            key={opp.id}
                            href={`/opportunities/${opp.opportunity.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          >
                            {opp.opportunity.viabilityThreshold && (
                              <span className="text-green-600 dark:text-green-400">✅</span>
                            )}
                            {opp.opportunity.title}
                            <span className="text-blue-500 dark:text-blue-400">
                              ({opp.opportunity.overallScore.toFixed(1)})
                            </span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {data.clusters.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No demand clusters found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Market demand clusters will appear here as more opportunities are analyzed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}