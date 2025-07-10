'use client';

import { useState } from 'react';

interface DeepDiveEstimate {
  estimatedPosts: number;
  estimatedDuration: string;
  estimatedRequests: number;
  warningMessage?: string;
}

interface DeepDiveRecommendations {
  maxPosts?: number;
  batchSize: number;
  delayBetweenRequests: number;
}

interface DeepDiveResult {
  eventId: string;
  success: boolean;
  message: string;
  parameters: {
    subreddit: string;
    targetDate: string;
    maxPosts: number | string;
    sortTypes: string[];
    timeframes: string[];
    includeComments: boolean;
    estimatedDuration: string;
  };
}

export default function DeepDivePage() {
  const [subreddit, setSubreddit] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [maxPosts, setMaxPosts] = useState('');
  const [includeComments, setIncludeComments] = useState(false);
  const [triggerImmediateAI, setTriggerImmediateAI] = useState(true);
  
  const [estimate, setEstimate] = useState<DeepDiveEstimate | null>(null);
  const [recommendations, setRecommendations] = useState<DeepDiveRecommendations | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [error, setError] = useState('');

  // Set default target date to 6 months ago
  const defaultTargetDate = new Date();
  defaultTargetDate.setMonth(defaultTargetDate.getMonth() - 6);
  const defaultTargetDateStr = defaultTargetDate.toISOString().split('T')[0];

  const handleEstimate = async () => {
    if (!subreddit || !targetDate) {
      setError('Please enter both subreddit and target date');
      return;
    }

    setIsEstimating(true);
    setError('');
    
    try {
      const response = await fetch(`/api/admin/deep-dive-scrape?subreddit=${encodeURIComponent(subreddit)}&targetDate=${encodeURIComponent(targetDate)}T00:00:00Z`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to estimate effort');
      }

      const data = await response.json();
      setEstimate(data.estimate);
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate effort');
    } finally {
      setIsEstimating(false);
    }
  };

  const handleStartDeepDive = async () => {
    if (!subreddit || !targetDate) {
      setError('Please enter both subreddit and target date');
      return;
    }

    setIsStarting(true);
    setError('');
    setResult(null);
    
    try {
      const requestData = {
        subreddit,
        targetDate: `${targetDate}T00:00:00Z`,
        maxPosts: maxPosts ? parseInt(maxPosts) : undefined,
        includeComments,
        triggerImmediateAI,
        batchSize: recommendations?.batchSize || 100,
        delayBetweenRequests: recommendations?.delayBetweenRequests || 1000
      };

      const response = await fetch('/api/admin/deep-dive-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start deep dive');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start deep dive');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Deep Dive Subreddit Scraping</h1>
        <p className="text-gray-600">
          Perform comprehensive, thorough scraping of a specific subreddit back to a target date.
          This tool bypasses the usual 100-post limit for in-depth analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Deep Dive Configuration</h2>
          <p className="text-gray-600 mb-6">
            Configure your comprehensive subreddit scraping operation
          </p>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="subreddit" className="block text-sm font-medium text-gray-700 mb-2">
                Subreddit Name
              </label>
              <input
                id="subreddit"
                type="text"
                placeholder="entrepreneur"
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value.replace(/^r\//, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">Enter without the &apos;r/&apos; prefix</p>
            </div>

            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-2">
                Target Date (scrape back to)
              </label>
              <input
                id="targetDate"
                type="date"
                value={targetDate || defaultTargetDateStr}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">Posts older than this date will not be scraped</p>
            </div>

            <div>
              <label htmlFor="maxPosts" className="block text-sm font-medium text-gray-700 mb-2">
                Max Posts (optional)
              </label>
              <input
                id="maxPosts"
                type="number"
                placeholder="Leave empty for unlimited"
                value={maxPosts}
                onChange={(e) => setMaxPosts(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">Leave empty to scrape all posts back to target date</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeComments"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="includeComments" className="text-sm font-medium text-gray-700">
                  Include comment scraping
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="triggerImmediateAI"
                  checked={triggerImmediateAI}
                  onChange={(e) => setTriggerImmediateAI(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="triggerImmediateAI" className="text-sm font-medium text-gray-700">
                  Trigger immediate AI analysis
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleEstimate}
                disabled={isEstimating || !subreddit || !targetDate}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEstimating ? 'Estimating...' : 'Estimate Effort'}
              </button>
              
              <button 
                onClick={handleStartDeepDive}
                disabled={isStarting || !subreddit || !targetDate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? 'Starting...' : 'Start Deep Dive'}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-800">
                  <span className="text-sm">⚠️ {error}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {/* Estimate Results */}
          {estimate && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Effort Estimate</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{estimate.estimatedPosts.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Estimated Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{estimate.estimatedDuration}</div>
                  <div className="text-sm text-gray-500">Est. Duration</div>
                </div>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-lg font-semibold">{estimate.estimatedRequests} API Requests</div>
              </div>

              {estimate.warningMessage && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <span className="text-sm">⚠️ {estimate.warningMessage}</span>
                  </div>
                </div>
              )}

              {recommendations && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Recommended Settings:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Batch Size: <span className="bg-gray-100 px-2 py-1 rounded">{recommendations.batchSize}</span></div>
                    <div>Delay: <span className="bg-gray-100 px-2 py-1 rounded">{recommendations.delayBetweenRequests}ms</span></div>
                  </div>
                  {recommendations.maxPosts && (
                    <div className="text-sm">
                      Suggested Max Posts: <span className="bg-gray-100 px-2 py-1 rounded">{recommendations.maxPosts.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Operation Results */}
          {result && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Deep Dive Started</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Running</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Subreddit:</span>
                  <span className="text-sm">r/{result.parameters.subreddit}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Target Date:</span>
                  <span className="text-sm">{new Date(result.parameters.targetDate).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Posts:</span>
                  <span className="text-sm">{result.parameters.maxPosts || 'Unlimited'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Event ID:</span>
                  <span className="text-xs font-mono">{result.eventId}</span>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mt-4">
                  <p className="text-sm text-blue-800">
                    🗄️ The deep dive operation is running in the background. 
                    Check the logs or database for progress updates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">How Deep Dive Scraping Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <h4 className="font-semibold">Multiple Sort Types</h4>
            <p className="text-sm text-gray-600">
              Scrapes using hot, new, and top sorting methods to ensure comprehensive coverage.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Time-based Filtering</h4>
            <p className="text-sm text-gray-600">
              Only scrapes posts newer than your target date, with multiple timeframes for top posts.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Smart Deduplication</h4>
            <p className="text-sm text-gray-600">
              Automatically detects and skips posts that are already in your database.
            </p>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Best Practices</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Start with a reasonable target date (3-6 months back) to test subreddit activity</li>
            <li>• Use the estimate feature before starting large operations</li>
            <li>• Consider setting a max posts limit for very active subreddits</li>
            <li>• Enable AI processing to immediately analyze discovered opportunities</li>
          </ul>
        </div>
      </div>
    </div>
  );
}