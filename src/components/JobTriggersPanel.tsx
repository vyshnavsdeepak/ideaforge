'use client';

import { TRPCJobTriggerButton } from './TRPCJobTriggerButton';

interface JobTriggersPanelProps {
  className?: string;
}

export function JobTriggersPanel({ className = '' }: JobTriggersPanelProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Essential Controls
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Three core functions to manage your Reddit AI opportunity system
        </p>
      </div>
      
      <div className="p-6">
        {/* Essential 3-Button Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TRPCJobTriggerButton
            action="scrapeAll"
            label="Scrape All Subreddits"
            icon="🚀"
            description="Force immediate scraping of all subreddits for fresh content"
            variant="primary"
            requireAuth={true}
          />
          
          <TRPCJobTriggerButton
            action="processUnprocessed"
            label="Process All Unprocessed"
            icon="🤖"
            description="Process any backlog of unprocessed posts with AI analysis"
            variant="primary"
            requireAuth={true}
            payload={{ limit: 500 }}
          />
          
          <TRPCJobTriggerButton
            action="clearCache"
            label="System Health Check"
            icon="❤️"
            description="Verify system status, database health, and processing pipeline"
            variant="secondary"
            requireAuth={true}
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            ⚡ Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TRPCJobTriggerButton
              action="processUnprocessed"
              label="Retry Failed Posts"
              icon="🔄"
              description="Retry posts that failed AI processing"
              variant="secondary"
              requireAuth={true}
            />
            
            <TRPCJobTriggerButton
              action="clearCache"
              label="View AI Costs"
              icon="💰"
              description="Check current AI usage and spending"
              variant="secondary"
              requireAuth={true}
            />
            
            <TRPCJobTriggerButton
              action="scrapeAll"
              label="Test Scrape"
              icon="🧪"
              description="Quick test of r/entrepreneur (10 posts)"
              variant="secondary"
              requireAuth={false}
              payload={{ subreddits: ["entrepreneur"], limit: 10 }}
            />
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 text-sm">ℹ️</span>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Streamlined Interface:</strong> These essential controls cover 90% of manual operations. 
              Advanced features have been consolidated for simplicity and reliability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}