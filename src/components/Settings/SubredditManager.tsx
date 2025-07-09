'use client';

import { useState, useEffect, useCallback } from 'react';
// Simple icon components to avoid external dependencies
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface SubredditConfig {
  id: string;
  name: string;
  isActive: boolean;
  priority: string;
  scrapeFrequency: string;
  maxPosts: number;
  sortBy: string;
  description: string | null;
  category: string | null;
  totalPostsScraped: number;
  opportunitiesFound: number;
  lastScraped: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type NewSubredditForm = {
  name: string;
  priority: string;
  scrapeFrequency: string;
  maxPosts: number;
  sortBy: string;
  description: string;
  category: string;
};

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const SORT_OPTIONS = [
  { value: 'hot', label: 'Hot' },
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
];

const CATEGORY_OPTIONS = [
  { value: 'Business', label: 'Business' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Other', label: 'Other' },
];

export function SubredditManager() {
  const [subreddits, setSubreddits] = useState<SubredditConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newSubreddit, setNewSubreddit] = useState<NewSubredditForm>({
    name: '',
    priority: 'medium',
    scrapeFrequency: 'hourly',
    maxPosts: 25,
    sortBy: 'hot',
    description: '',
    category: 'Business',
  });

  const fetchSubreddits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subreddit-config?includeInactive=true');
      if (!response.ok) throw new Error('Failed to fetch subreddits');
      const data = await response.json();
      setSubreddits(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subreddits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubreddits();
  }, [fetchSubreddits]);

  const handleAddSubreddit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await fetch('/api/subreddit-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubreddit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add subreddit');
      }

      setSuccess('Subreddit added successfully!');
      setShowAddForm(false);
      setNewSubreddit({
        name: '',
        priority: 'medium',
        scrapeFrequency: 'hourly',
        maxPosts: 25,
        sortBy: 'hot',
        description: '',
        category: 'Business',
      });
      fetchSubreddits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subreddit');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      setError(null);
      const response = await fetch(`/api/subreddit-config/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) throw new Error('Failed to update subreddit');
      
      setSuccess('Subreddit updated successfully!');
      fetchSubreddits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subreddit');
    }
  };

  const handleDeleteSubreddit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subreddit configuration?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/subreddit-config/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete subreddit');
      
      setSuccess('Subreddit deleted successfully!');
      fetchSubreddits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subreddit');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setError(null);
      const response = await fetch('/api/subreddit-config/seed', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to seed default subreddits');
      
      setSuccess('Default subreddits seeded successfully!');
      fetchSubreddits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed default subreddits');
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Subreddit Configuration
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage which subreddits to scrape for opportunities and configure their settings.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSeedDefaults}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Seed Defaults
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Subreddit
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={clearMessages} className="text-red-600 hover:text-red-800 dark:text-red-400">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          <button onClick={clearMessages} className="text-green-600 hover:text-green-800 dark:text-green-400">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <form onSubmit={handleAddSubreddit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subreddit Name
                </label>
                <input
                  type="text"
                  value={newSubreddit.name}
                  onChange={(e) => setNewSubreddit({ ...newSubreddit, name: e.target.value })}
                  placeholder="entrepreneur"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <select
                  value={newSubreddit.category}
                  onChange={(e) => setNewSubreddit({ ...newSubreddit, category: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Priority
                </label>
                <select
                  value={newSubreddit.priority}
                  onChange={(e) => setNewSubreddit({ ...newSubreddit, priority: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Scrape Frequency
                </label>
                <select
                  value={newSubreddit.scrapeFrequency}
                  onChange={(e) => setNewSubreddit({ ...newSubreddit, scrapeFrequency: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Max Posts
                </label>
                <input
                  type="number"
                  value={newSubreddit.maxPosts}
                  onChange={(e) => setNewSubreddit({ ...newSubreddit, maxPosts: parseInt(e.target.value) })}
                  min="1"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort By
                </label>
                <select
                  value={newSubreddit.sortBy}
                  onChange={(e) => setNewSubreddit({ ...newSubreddit, sortBy: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (Optional)
              </label>
              <textarea
                value={newSubreddit.description}
                onChange={(e) => setNewSubreddit({ ...newSubreddit, description: e.target.value })}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Optional description for this subreddit..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Subreddit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subreddits List */}
      <div className="space-y-4">
        {subreddits.map((subreddit) => (
          <div
            key={subreddit.id}
            className={`p-4 border rounded-lg ${
              subreddit.isActive
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    r/{subreddit.name}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      subreddit.priority === 'high'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : subreddit.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}
                  >
                    {subreddit.priority}
                  </span>
                  {subreddit.category && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/20 dark:text-blue-400">
                      {subreddit.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleActive(subreddit.id, subreddit.isActive)}
                  className={`px-3 py-1 text-xs font-medium rounded-md ${
                    subreddit.isActive
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {subreddit.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => setEditingId(subreddit.id)}
                  className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSubreddit(subreddit.id)}
                  className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="font-medium">Frequency:</span> {subreddit.scrapeFrequency}
                </div>
                <div>
                  <span className="font-medium">Max Posts:</span> {subreddit.maxPosts}
                </div>
                <div>
                  <span className="font-medium">Sort:</span> {subreddit.sortBy}
                </div>
                <div>
                  <span className="font-medium">Posts Scraped:</span> {subreddit.totalPostsScraped}
                </div>
              </div>
              {subreddit.description && (
                <p className="mt-2 text-gray-500 dark:text-gray-400">{subreddit.description}</p>
              )}
              <div className="mt-2 flex items-center space-x-4 text-xs">
                <span>
                  <span className="font-medium">Opportunities:</span> {subreddit.opportunitiesFound}
                </span>
                {subreddit.lastScraped && (
                  <span>
                    <span className="font-medium">Last Scraped:</span>{' '}
                    {new Date(subreddit.lastScraped).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {subreddits.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No subreddit configurations found. Add your first subreddit or seed default ones.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}