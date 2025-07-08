'use client';

import { useState } from 'react';

export function TriggerScrapingButton() {
  const [isTriggering, setIsTriggering] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTrigger = async () => {
    setIsTriggering(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/trigger/scraping', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(`✅ Successfully triggered scraping for r/${data.subreddit}`);
      } else if (response.status === 401) {
        setResult('❌ Unauthorized - Please sign in first');
      } else {
        setResult('❌ Failed to trigger scraping');
      }
    } catch {
      setResult('❌ Error triggering scraping');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleTrigger}
        disabled={isTriggering}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        {isTriggering ? '⏳ Triggering...' : '🚀 Test Reddit Scraping'}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">{result}</p>
        </div>
      )}
    </div>
  );
}