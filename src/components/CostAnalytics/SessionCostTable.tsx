'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrency, formatNumber, formatDateTime, formatDuration } from '../../lib/format-utils';

interface Session {
  id: string;
  sessionType: string;
  triggeredBy: string;
  subreddit: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  postsRequested: number;
  postsProcessed: number;
  opportunitiesFound: number;
  totalCost: number;
  averageCostPerPost: number;
  successRate: number;
  errorCount: number;
}

interface SessionCostTableProps {
  limit?: number;
  className?: string;
  showDetails?: boolean;
}

export function SessionCostTable({ limit = 10, className = '', showDetails = false }: SessionCostTableProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/ai-sessions?limit=${limit}&offset=${offset}&details=${showDetails}`
      );
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const result = await response.json();
      setSessions(result.sessions || []);
      setHasMore(result.pagination?.hasMore || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, showDetails]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const getSessionTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      batch: '📦',
      individual: '🎯',
      fallback: '🔄',
    };
    return icons[type] || '📊';
  };

  const getSessionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      batch: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
      individual: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
      fallback: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    };
    return colors[type] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || sessions.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent AI Sessions
          </h3>
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            No sessions found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent AI Sessions
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Session
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Posts
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Results
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => setSelectedSession(selectedSession === session.id ? null : session.id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSessionTypeColor(session.sessionType)}`}>
                        <span className="mr-1">{getSessionTypeIcon(session.sessionType)}</span>
                        {session.sessionType}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <div>{formatDateTime(session.startTime)}</div>
                        {session.subreddit && (
                          <div className="text-gray-400">r/{session.subreddit}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatNumber(session.postsProcessed)} / {formatNumber(session.postsRequested)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round((session.postsProcessed / session.postsRequested) * 100)}% completed
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatNumber(session.opportunitiesFound)} opportunities
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {session.errorCount > 0 && `${session.errorCount} errors`}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(session.totalCost)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(session.averageCostPerPost)}/post
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {session.successRate.toFixed(1)}% success
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {session.duration && formatDuration(session.duration)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {offset + 1}-{offset + sessions.length} sessions
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={!hasMore}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}