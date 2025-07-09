'use client';

import { JobTriggerButton } from './JobTriggerButton';

interface JobTriggersPanelProps {
  className?: string;
}

export function JobTriggersPanel({ className = '' }: JobTriggersPanelProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Manual Job Controls
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Trigger jobs manually for testing or immediate execution
        </p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Reddit Scraping */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              📝 Reddit Scraping
            </h3>
            <div className="space-y-3">
              <JobTriggerButton
                endpoint="/api/trigger/scraping"
                label="Single Subreddit"
                icon="🎯"
                description="Scrape 25 posts from a random subreddit"
                variant="primary"
                requireAuth={true}
              />
              
              <JobTriggerButton
                endpoint="/api/trigger-scraping"
                label="Test Scraping"
                icon="🧪"
                description="Quick test scrape (r/entrepreneur, 10 posts)"
                variant="secondary"
                requireAuth={false}
              />
              
              <JobTriggerButton
                endpoint="/api/trigger-mega-scraping"
                label="Mega-Batch Scraping"
                icon="🚀"
                description="Scrape all subreddits simultaneously"
                variant="primary"
                requireAuth={false}
              />
            </div>
          </div>

          {/* AI Analysis */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              🤖 AI Analysis
            </h3>
            <div className="space-y-3">
              <JobTriggerButton
                endpoint="/api/admin/process-unprocessed-posts"
                label="Batch Process Unprocessed"
                icon="🔄"
                description="Comprehensive batch processing of all unprocessed Reddit posts (up to 500)"
                variant="primary"
                requireAuth={true}
                payload={{
                  limit: 500
                }}
              />
              
              <JobTriggerButton
                endpoint="/api/admin/process-batch-ai"
                label="Process Batch AI Now"
                icon="🤖"
                description="Immediate AI analysis of all unprocessed posts (up to 200)"
                variant="primary"
                requireAuth={true}
              />
              
              <JobTriggerButton
                endpoint="/api/admin/reprocess-failed-posts"
                label="Reprocess Failed Posts"
                icon="🔄"
                description="Retry AI analysis for posts with processing errors"
                variant="secondary"
                requireAuth={true}
              />
            </div>
          </div>

          {/* System Maintenance */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              🔧 System Maintenance
            </h3>
            <div className="space-y-3">
              <JobTriggerButton
                endpoint="/api/admin/system-health"
                label="System Health Check"
                icon="❤️"
                description="Check database, AI models, and system status"
                variant="secondary"
                requireAuth={true}
                method="GET"
              />
              
              <JobTriggerButton
                endpoint="/api/analytics/ai-costs"
                label="View AI Cost Analytics"
                icon="💰"
                description="Check current AI usage and costs"
                variant="secondary"
                requireAuth={true}
                method="GET"
              />
            </div>
          </div>
        </div>

        {/* Advanced Controls */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            ⚙️ Advanced Controls
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <JobTriggerButton
                endpoint="/api/admin/restart-workflows"
                label="Restart Failed Workflows"
                icon="🔄"
                description="Restart any stuck or failed background workflows"
                variant="danger"
                requireAuth={true}
              />
              
              <JobTriggerButton
                endpoint="/api/admin/aggregate-daily-usage"
                label="Aggregate Daily Usage"
                icon="📊"
                description="Manually trigger daily AI usage aggregation"
                variant="secondary"
                requireAuth={true}
                payload={{ action: 'aggregate' }}
              />
            </div>
            
            <div className="space-y-3">
              <JobTriggerButton
                endpoint="/api/trigger-mega-scraping"
                label="Emergency Mega-Scraping"
                icon="🚨"
                description="Trigger comprehensive scraping of all subreddits"
                variant="danger"
                requireAuth={true}
              />
              
              <JobTriggerButton
                endpoint="/api/admin/process-batch-ai"
                label="Force Batch Processing"
                icon="⚡"
                description="Force immediate processing of all unprocessed posts"
                variant="danger"
                requireAuth={true}
                method="GET"
              />
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠️</span>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Important:</strong> Advanced controls can affect system performance and should be used with caution. 
              Some operations may take several minutes to complete.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}