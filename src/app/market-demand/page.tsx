'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Layers, 
  Search,
  BarChart3,
  Zap,
  Target,
  Sparkles
} from 'lucide-react';

interface MarketDemandCluster {
  id: string;
  niche: string;
  demandSignal: string;
  occurrenceCount: number;
  subreddits: string[];
  lastSeen: string;
  relatedOpportunities: Array<{
    id: string;
    title: string;
    score: number;
    viable: boolean;
  }>;
  marketStrength: number;
}

export default function MarketDemandPage() {
  const [clusters, setClusters] = useState<MarketDemandCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'trending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchClusters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '30',
        ...(selectedNiche && { niche: selectedNiche }),
        ...(viewMode === 'trending' && { trending: 'true' }),
      });

      const response = await fetch(`/api/market-demand/clusters?${params}`);
      const data = await response.json();
      setClusters(data.clusters || []);
    } catch (error) {
      console.error('Error fetching market demand:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNiche, viewMode]);

  const getMarketStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-600 bg-green-50';
    if (strength >= 60) return 'text-amber-600 bg-amber-50';
    if (strength >= 40) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getMarketStrengthLabel = (strength: number) => {
    if (strength >= 80) return 'Very Strong';
    if (strength >= 60) return 'Strong';
    if (strength >= 40) return 'Moderate';
    return 'Emerging';
  };

  const uniqueNiches = Array.from(new Set(clusters.map(c => c.niche)));
  
  const filteredClusters = clusters.filter(cluster => 
    cluster.demandSignal.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cluster.niche.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Market Demand Intelligence
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Discover validated startup opportunities through AI-powered analysis of recurring market demands
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Demand Signals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clusters.reduce((sum, c) => sum + c.occurrenceCount, 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Niches</p>
                <p className="text-2xl font-bold text-gray-900">{uniqueNiches.length}</p>
              </div>
              <Layers className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subreddits Analyzed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(clusters.flatMap(c => c.subreddits)).size}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viable Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clusters.filter(c => 
                    c.relatedOpportunities.some(o => o.viable)
                  ).length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search demand signals..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Demands
              </button>
              <button
                onClick={() => setViewMode('trending')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'trending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Trending
                </span>
              </button>
            </div>

            {/* Niche Filter */}
            <select
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Niches</option>
              {uniqueNiches.map(niche => (
                <option key={niche} value={niche}>{niche}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Demand Clusters Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-16">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">
                          {cluster.niche}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        &ldquo;{cluster.demandSignal}&rdquo;
                      </h3>
                    </div>
                  </div>

                  {/* Market Strength Badge */}
                  <div className="mb-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getMarketStrengthColor(cluster.marketStrength)}`}>
                      <BarChart3 className="h-4 w-4" />
                      {getMarketStrengthLabel(cluster.marketStrength)}
                      <span className="text-xs">({cluster.marketStrength}%)</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Occurrences</p>
                      <p className="text-xl font-bold text-gray-900">{cluster.occurrenceCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Subreddits</p>
                      <p className="text-xl font-bold text-gray-900">{cluster.subreddits.length}</p>
                    </div>
                  </div>

                  {/* Subreddit Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {cluster.subreddits.slice(0, 3).map((subreddit) => (
                      <span
                        key={subreddit}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        r/{subreddit}
                      </span>
                    ))}
                    {cluster.subreddits.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        +{cluster.subreddits.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Related Opportunities */}
                  {cluster.relatedOpportunities.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Related Opportunities
                      </p>
                      <div className="space-y-2">
                        {cluster.relatedOpportunities.slice(0, 2).map((opp) => (
                          <div
                            key={opp.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-600 truncate flex-1">
                              {opp.title}
                            </span>
                            <span className={`ml-2 font-medium ${
                              opp.viable ? 'text-green-600' : 'text-gray-400'
                            }`}>
                              {opp.score}/10
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Seen */}
                  <div className="mt-4 text-xs text-gray-500">
                    Last seen: {new Date(cluster.lastSeen).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredClusters.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-gray-500">No demand clusters found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}