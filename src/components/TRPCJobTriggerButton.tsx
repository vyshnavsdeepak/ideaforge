'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/trpc/client';

interface TRPCJobTriggerButtonProps {
  action: 'scrapeAll' | 'processUnprocessed' | 'forceBatch' | 'clearCache';
  label: string;
  icon: string;
  description?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  requireAuth?: boolean;
  className?: string;
  disabled?: boolean;
  payload?: Record<string, unknown>;
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
};

export function TRPCJobTriggerButton({
  action,
  label,
  icon,
  description,
  variant = 'secondary',
  requireAuth = false,
  className = '',
  disabled = false,
  payload = {},
}: TRPCJobTriggerButtonProps) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { data: session } = useSession();

  // Get the appropriate mutations
  const scrapeMutation = api.jobs.triggerScraping.useMutation();
  const processUnprocessedMutation = api.jobs.processUnprocessedPosts.useMutation();
  const forceBatchMutation = api.jobs.forceBatchAI.useMutation();
  const clearCacheMutation = api.jobs.clearCache.useMutation();

  const handleTrigger = async () => {
    // Check authentication if required
    if (requireAuth && !session) {
      setMessage({ type: 'error', text: 'Authentication required' });
      return;
    }

    setMessage(null);

    try {
      let result;
      switch (action) {
        case 'scrapeAll':
          if (payload.subreddits || payload.limit) {
            result = await scrapeMutation.mutateAsync({
              subreddits: payload.subreddits as string[] | undefined,
              limit: payload.limit as number | undefined,
            });
          } else {
            result = await scrapeMutation.mutateAsync({});
          }
          break;
        case 'processUnprocessed':
          result = await processUnprocessedMutation.mutateAsync();
          break;
        case 'forceBatch':
          result = await forceBatchMutation.mutateAsync();
          break;
        case 'clearCache':
          result = await clearCacheMutation.mutateAsync();
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      setMessage({ 
        type: 'success', 
        text: result.message || `${label} triggered successfully` 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };

  // Get the loading state from the appropriate mutation
  const isLoading = 
    (action === 'scrapeAll' && scrapeMutation.isPending) ||
    (action === 'processUnprocessed' && processUnprocessedMutation.isPending) ||
    (action === 'forceBatch' && forceBatchMutation.isPending) ||
    (action === 'clearCache' && clearCacheMutation.isPending);

  return (
    <div className={`w-full ${className}`}>
      <button
        onClick={handleTrigger}
        disabled={isLoading || disabled}
        className={`
          w-full px-4 py-2 text-sm font-medium border rounded-md transition-colors
          ${variantStyles[variant]}
          ${isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Loading...</span>
          </div>
        ) : (
          <span>{icon} {label}</span>
        )}
      </button>
      
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      )}
      
      {message && (
        <div className={`mt-2 p-2 rounded-md text-xs ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}