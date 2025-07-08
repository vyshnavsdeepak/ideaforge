'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';

interface OpportunityFiltersProps {
  initialSearch?: string;
  initialSubreddit?: string;
  initialMinScore?: number;
  initialSortBy?: 'score' | 'date' | 'subreddit';
  initialSortOrder?: 'asc' | 'desc';
}

export function OpportunityFilters({
  initialSearch = '',
  initialSubreddit = '',
  initialMinScore = 0,
  initialSortBy = 'score',
  initialSortOrder = 'desc',
}: OpportunityFiltersProps) {
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedSubreddit, setSelectedSubreddit] = useState(initialSubreddit);
  const [minScore, setMinScore] = useState(initialMinScore);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  const subreddits = [
    'entrepreneur', 'startups', 'smallbusiness', 'business', 'accounting',
    'finance', 'investing', 'legaladvice', 'lawyers', 'medicine', 'healthcare',
    'programming', 'webdev', 'datascience', 'MachineLearning', 'artificialintelligence'
  ];

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.set('search', searchTerm);
    if (selectedSubreddit) params.set('subreddit', selectedSubreddit);
    if (minScore > 0) params.set('minScore', minScore.toString());
    if (sortBy !== 'score') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    
    const queryString = params.toString();
    router.push(`/opportunities${queryString ? `?${queryString}` : ''}`);
  }, [searchTerm, selectedSubreddit, minScore, sortBy, sortOrder, router]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm, updateURL]);

  // Immediate updates for other filters
  useEffect(() => {
    updateURL();
  }, [selectedSubreddit, minScore, sortBy, sortOrder, updateURL]);

  const handleSubredditToggle = (subreddit: string) => {
    setSelectedSubreddit(prev => prev === subreddit ? '' : subreddit);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedSubreddit('');
    setMinScore(0);
    setSortBy('score');
    setSortOrder('desc');
    router.push('/opportunities');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 mb-4">
        <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filter & Search Opportunities
        </h2>
        {(searchTerm || selectedSubreddit || minScore > 0) && (
          <button
            onClick={clearAllFilters}
            className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search opportunities..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Minimum Score
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={minScore}
            onChange={(e) => setMinScore(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>0</span>
            <span className="font-medium">{minScore.toFixed(1)}</span>
            <span>10</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sort By
          </label>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'date' | 'subreddit')}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="score">Overall Score</option>
              <option value="date">Date Added</option>
              <option value="subreddit">Subreddit</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Subreddit
        </label>
        <div className="flex flex-wrap gap-2">
          {subreddits.map((subreddit) => (
            <button
              key={subreddit}
              onClick={() => handleSubredditToggle(subreddit)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedSubreddit === subreddit
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              r/{subreddit}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}