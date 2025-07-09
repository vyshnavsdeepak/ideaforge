'use client';

import { useState } from 'react';

export function CostSettings() {
  const [settings, setSettings] = useState({
    dailyLimit: 10.0,
    monthlyLimit: 300.0,
    alertThreshold: 0.8,
    enableAlerts: true,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setSuccess('Cost settings saved successfully!');
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Cost Management
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure cost limits and alerts for AI usage.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Daily Cost Limit ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.dailyLimit}
              onChange={(e) => setSettings({ ...settings, dailyLimit: parseFloat(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Monthly Cost Limit ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.monthlyLimit}
              onChange={(e) => setSettings({ ...settings, monthlyLimit: parseFloat(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Alert Threshold (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={settings.alertThreshold}
              onChange={(e) => setSettings({ ...settings, alertThreshold: parseFloat(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500">Send alerts when {Math.round(settings.alertThreshold * 100)}% of limit is reached</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enableAlerts}
              onChange={(e) => setSettings({ ...settings, enableAlerts: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Enable cost alerts
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}