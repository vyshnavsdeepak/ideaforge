'use client';

import { useState, useCallback } from 'react';
import { UserActivityScraper } from '../../components/UserActivity/UserActivityScraper';
import { UserActivityViewer } from '../../components/UserActivity/UserActivityViewer';

export function UserActivityContent() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const handleUserSelected = useCallback((username: string) => {
    setSelectedUser(username);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Activity Deep Dive
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Analyze Reddit user activity to discover opportunities from their posts and comments.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - User Search and Scraping */}
          <div className="lg:col-span-1">
            <UserActivityScraper onUserSelected={handleUserSelected} />
          </div>

          {/* Right Panel - User Activity Viewer */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <UserActivityViewer username={selectedUser} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  <div className="text-6xl mb-4">👤</div>
                  <h3 className="text-lg font-medium mb-2">No User Selected</h3>
                  <p className="text-sm">
                    Search for and scrape a Reddit user&apos;s activity to see their posts, comments, and opportunities.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}