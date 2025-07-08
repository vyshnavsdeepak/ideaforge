'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Filters {
  search: string;
  subreddit: string;
  niche: string;
  businessType: string;
  platform: string;
  targetAudience: string;
  industryVertical: string;
  minScore: number;
  viability: string;
  sortBy: string;
  sortOrder: string;
  [key: string]: string | number;
}

interface FilterPanelProps {
  filters: Filters;
  filterOptions: {
    subreddits: string[];
    niches: string[];
    businessTypes: string[];
    platforms: string[];
    targetAudiences: string[];
    industryVerticals: string[];
    developmentComplexities: string[];
    capitalRequirements: string[];
    marketTrends: string[];
  };
  onFilterChange: (filters: Filters) => void;
}

interface FilterSectionProps {
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClear: () => void;
}

function FilterSection({ title, options, selectedValue, onSelect, onClear }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (options.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/70 dark:hover:bg-gray-700/70 transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
          {selectedValue && (
            <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
              {selectedValue}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-600/50 shadow-xl">
          {selectedValue && (
            <button
              onClick={() => {
                onClear();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
            >
              Clear selection
              <X className="w-4 h-4" />
            </button>
          )}
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                selectedValue === option
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterPanel({ filters, filterOptions, onFilterChange }: FilterPanelProps) {
  const handleFilterChange = (key: string, value: string | number) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleClearFilter = (key: string) => {
    onFilterChange({ ...filters, [key]: '' });
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all' && v !== 'score' && v !== 'desc' && v !== 0).length;

  return (
    <div className="space-y-6">
      {/* Score Range Slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Minimum Score: {filters.minScore || 0}
        </label>
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={filters.minScore || 0}
          onChange={(e) => handleFilterChange('minScore', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      {/* Viability Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Viability</label>
        <div className="flex gap-2">
          {['all', 'viable', 'not-viable'].map((option) => (
            <button
              key={option}
              onClick={() => handleFilterChange('viability', option)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filters.viability === option
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70'
              }`}
            >
              {option === 'all' ? 'All' : option === 'viable' ? 'Viable Only' : 'Not Viable'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FilterSection
          title="Subreddit"
          options={filterOptions.subreddits}
          selectedValue={filters.subreddit}
          onSelect={(value) => handleFilterChange('subreddit', value)}
          onClear={() => handleClearFilter('subreddit')}
        />
        
        <FilterSection
          title="Niche"
          options={filterOptions.niches}
          selectedValue={filters.niche}
          onSelect={(value) => handleFilterChange('niche', value)}
          onClear={() => handleClearFilter('niche')}
        />
        
        <FilterSection
          title="Business Type"
          options={filterOptions.businessTypes}
          selectedValue={filters.businessType}
          onSelect={(value) => handleFilterChange('businessType', value)}
          onClear={() => handleClearFilter('businessType')}
        />
        
        <FilterSection
          title="Platform"
          options={filterOptions.platforms}
          selectedValue={filters.platform}
          onSelect={(value) => handleFilterChange('platform', value)}
          onClear={() => handleClearFilter('platform')}
        />
        
        <FilterSection
          title="Target Audience"
          options={filterOptions.targetAudiences}
          selectedValue={filters.targetAudience}
          onSelect={(value) => handleFilterChange('targetAudience', value)}
          onClear={() => handleClearFilter('targetAudience')}
        />
        
        <FilterSection
          title="Industry"
          options={filterOptions.industryVerticals}
          selectedValue={filters.industryVertical}
          onSelect={(value) => handleFilterChange('industryVertical', value)}
          onClear={() => handleClearFilter('industryVertical')}
        />
      </div>

      {/* Sort Options */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Sort By</label>
          <div className="flex gap-2">
            {[
              { value: 'score', label: 'Score' },
              { value: 'date', label: 'Date' },
              { value: 'subreddit', label: 'Subreddit' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('sortBy', option.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  filters.sortBy === option.value
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Order</label>
          <div className="flex gap-2">
            {[
              { value: 'desc', label: 'Descending' },
              { value: 'asc', label: 'Ascending' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('sortOrder', option.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  filters.sortOrder === option.value
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clear All Filters */}
      {activeFilterCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => onFilterChange({
              search: '',
              subreddit: '',
              niche: '',
              businessType: '',
              platform: '',
              targetAudience: '',
              industryVertical: '',
              minScore: 0,
              viability: 'all',
              sortBy: 'score',
              sortOrder: 'desc',
            })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All Filters ({activeFilterCount})
          </button>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #9333ea, #6366f1);
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #9333ea, #6366f1);
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}