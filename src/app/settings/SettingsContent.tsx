'use client';

import { useState } from 'react';
import { SubredditManager } from '../../components/Settings/SubredditManager';
import { CostSettings } from '../../components/Settings/CostSettings';
import { SystemSettings } from '../../components/Settings/SystemSettings';

const SETTINGS_TABS = [
  { id: 'subreddits', label: 'Subreddit Configuration', icon: '🔍' },
  { id: 'costs', label: 'AI Cost Management', icon: '💰' },
  { id: 'system', label: 'System Settings', icon: '⚙️' },
] as const;

type SettingsTab = typeof SETTINGS_TABS[number]['id'];

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('subreddits');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'subreddits':
        return <SubredditManager />;
      case 'costs':
        return <CostSettings />;
      case 'system':
        return <SystemSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure your Reddit AI Opportunity Finder settings and preferences.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}