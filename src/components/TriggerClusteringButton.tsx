'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export function TriggerClusteringButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/opportunities/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ Clustering analysis initiated! Generated ${data.clustersGenerated} clusters.`);
      } else {
        setMessage('❌ Failed to trigger clustering analysis');
      }
    } catch {
      setMessage('❌ Error triggering clustering analysis');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isLoading ? 'Analyzing...' : '🔬 Cluster Opportunities'}
      </button>
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
}