'use client';

import { useState } from 'react';

export function HistoricalRecoveryButton() {
  const [isTriggering, setIsTriggering] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleTrigger = async () => {
    setIsTriggering(true);
    setResult(null);
    setShowConfirmation(false);
    
    try {
      const response = await fetch('/api/trigger-historical-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceRecovery: true }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(`✅ ${data.message}`);
      } else if (response.status === 401) {
        setResult('❌ Unauthorized - Please sign in first');
      } else {
        const errorData = await response.json();
        setResult(`❌ ${errorData.error || 'Failed to trigger historical recovery'}`);
      }
    } catch (error) {
      setResult('❌ Error triggering historical recovery');
      console.error('Historical recovery error:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleConfirmation = () => {
    setShowConfirmation(false);
    handleTrigger();
  };

  return (
    <div>
      <button
        onClick={() => setShowConfirmation(true)}
        disabled={isTriggering}
        className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        {isTriggering ? '⏳ Recovering...' : '📅 Historical Recovery (1 Year)'}
      </button>
      
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ⚠️ Confirm Historical Recovery
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will scrape Reddit posts from the past year for all active subreddits. 
              This is a comprehensive operation that may:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-1">
              <li>• Take 30-60 minutes to complete</li>
              <li>• Generate significant Reddit API usage</li>
              <li>• Process thousands of posts</li>
              <li>• Trigger AI analysis for all new posts</li>
            </ul>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-4">
              Only use this for data recovery purposes.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmation}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Confirm Recovery
              </button>
            </div>
          </div>
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">{result}</p>
          {result.includes('✅') && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Check the Jobs & Status page to monitor progress.
            </p>
          )}
        </div>
      )}
    </div>
  );
}