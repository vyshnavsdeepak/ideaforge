'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '../../lib/format-utils';

interface CostAlert {
  id: string;
  alertType: string;
  threshold: number;
  period: string;
  description: string;
  isActive: boolean;
  emailNotification: boolean;
  slackNotification: boolean;
  currentValue: number;
  isCurrentlyTriggered: boolean;
  percentageUsed: number;
  lastTriggered: string | null;
}

interface CostAlertsPanelProps {
  className?: string;
}

export function CostAlertsPanel({ className = '' }: CostAlertsPanelProps) {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    alertType: 'daily',
    threshold: 10,
    description: '',
    emailNotification: true,
    slackNotification: false,
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/cost-alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const result = await response.json();
      setAlerts(result.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    try {
      const response = await fetch('/api/analytics/cost-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAlert,
          period: newAlert.alertType,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create alert');
      
      setShowCreateForm(false);
      setNewAlert({
        alertType: 'daily',
        threshold: 10,
        description: '',
        emailNotification: true,
        slackNotification: false,
      });
      fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create alert');
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/analytics/cost-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      
      if (!response.ok) throw new Error('Failed to update alert');
      fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update alert');
    }
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    
    try {
      const response = await fetch(`/api/analytics/cost-alerts?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete alert');
      fetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete alert');
    }
  };

  const getAlertIcon = (type: string) => {
    const icons: Record<string, string> = {
      daily: '📅',
      weekly: '📊',
      monthly: '📈',
      threshold: '⚠️',
    };
    return icons[type] || '🔔';
  };

  const getAlertColor = (percentageUsed: number, isTriggered: boolean) => {
    if (isTriggered) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    if (percentageUsed >= 80) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    if (percentageUsed >= 50) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cost Alerts
          </h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + New Alert
          </button>
        </div>

        {/* Create Alert Form */}
        {showCreateForm && (
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Create New Alert
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Alert Type
                </label>
                <select
                  value={newAlert.alertType}
                  onChange={(e) => setNewAlert({ ...newAlert, alertType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Threshold ($)
                </label>
                <input
                  type="number"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="0.01"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newAlert.description}
                  onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Alert when daily costs exceed $10"
                />
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={newAlert.emailNotification}
                    onChange={(e) => setNewAlert({ ...newAlert, emailNotification: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Email notification
                </label>
                
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={newAlert.slackNotification}
                    onChange={(e) => setNewAlert({ ...newAlert, slackNotification: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Slack notification
                </label>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={createAlert}
                  disabled={!newAlert.description || newAlert.threshold <= 0}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No alerts configured. Create one to monitor your AI costs.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAlertColor(alert.percentageUsed, alert.isCurrentlyTriggered)}`}>
                        <span className="mr-1">{getAlertIcon(alert.alertType)}</span>
                        {alert.alertType}
                      </span>
                      {alert.isCurrentlyTriggered && (
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                          TRIGGERED
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-900 dark:text-white mb-2">
                      {alert.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Threshold: {formatCurrency(alert.threshold)}</span>
                      <span>Current: {formatCurrency(alert.currentValue)}</span>
                      <span>{alert.percentageUsed}% used</span>
                      {alert.lastTriggered && (
                        <span>Last triggered: {new Date(alert.lastTriggered).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          alert.isCurrentlyTriggered
                            ? 'bg-red-500'
                            : alert.percentageUsed >= 80
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(alert.percentageUsed, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {alert.emailNotification && (
                        <span className="text-gray-500 dark:text-gray-400">📧 Email</span>
                      )}
                      {alert.slackNotification && (
                        <span className="text-gray-500 dark:text-gray-400">💬 Slack</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleAlert(alert.id, alert.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        alert.isActive ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          alert.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}