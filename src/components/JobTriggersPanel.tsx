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
                endpoint="/api/inngest"
                label="Analyze Unprocessed Posts"
                icon="🔍"
                description="Trigger AI analysis for posts without opportunities"
                variant="primary"
                requireAuth={true}
                payload={{
                  name: 'ai/batch-analyze.opportunities',
                  data: { type: 'unprocessed' }
                }}
              />
              
              <JobTriggerButton
                endpoint="/api/inngest"
                label="Reprocess Failed Posts"
                icon="🔄"
                description="Retry AI analysis for failed posts"
                variant="secondary"
                requireAuth={true}
                payload={{
                  name: 'ai/batch-analyze.opportunities',
                  data: { type: 'failed' }
                }}
              />
              
              <JobTriggerButton
                endpoint="/api/inngest"
                label="Full Mega-Batch Analysis"
                icon="⚡"
                description="Run complete AI analysis pipeline"
                variant="primary"
                requireAuth={true}
                payload={{
                  name: 'ai/mega-batch-analyze.opportunities',
                  data: { force: true }
                }}
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
                endpoint="/api/admin/deduplication"
                label="Cleanup Duplicates"
                icon="🧹"
                description="Remove duplicate posts and opportunities"
                variant="secondary"
                requireAuth={true}
                payload={{ action: 'cleanup' }}
              />
              
              <JobTriggerButton
                endpoint="/api/admin/fix-urls"
                label="Fix Reddit URLs"
                icon="🔗"
                description="Fix malformed permalink URLs"
                variant="secondary"
                requireAuth={false}
              />
              
              <JobTriggerButton
                endpoint="/api/admin/system-health"
                label="System Health Check"
                icon="❤️"
                description="Check all system components"
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
                endpoint="/api/admin/clear-cache"
                label="Clear System Cache"
                icon="🗑️"
                description="Clear all cached data and temporary files"
                variant="danger"
                requireAuth={true}
              />
            </div>
            
            <div className="space-y-3">
              <JobTriggerButton
                endpoint="/api/admin/rebuild-indexes"
                label="Rebuild Database Indexes"
                icon="📊"
                description="Rebuild all database indexes for better performance"
                variant="danger"
                requireAuth={true}
              />
              
              <JobTriggerButton
                endpoint="/api/admin/force-sync"
                label="Force Data Sync"
                icon="🔄"
                description="Force synchronization of all data relationships"
                variant="danger"
                requireAuth={true}
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