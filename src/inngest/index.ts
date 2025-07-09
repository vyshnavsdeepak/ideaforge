// Export all Inngest functions for registration
export * from './functions';
export * from './scheduled-jobs';

// Import all functions to create a functions array for easy serving
import {
  scrapeSubreddit,
  analyzeOpportunity,
  dailyRedditScrape,
  scrapeAllSubreddits,
  batchAnalyzeOpportunitiesFunction,
  processUnprocessedPosts,
  scrapeUserActivity,
  analyzeUserActivity,
} from './functions';

import {
  peakActivityScraper,
  dailyComprehensiveScraper,
  realTimeHotScraper,
  weekendOpportunityDiscovery,
  devModeScraper,
  batchAIProcessor,
} from './scheduled-jobs';

// Create a single array of all functions for easy serving
export const allFunctions = [
  // Core functions
  scrapeSubreddit,
  analyzeOpportunity,
  dailyRedditScrape,
  scrapeAllSubreddits,
  batchAnalyzeOpportunitiesFunction,
  processUnprocessedPosts,
  scrapeUserActivity,
  analyzeUserActivity,
  
  // Scheduled jobs
  peakActivityScraper,
  dailyComprehensiveScraper,
  realTimeHotScraper,
  weekendOpportunityDiscovery,
  devModeScraper,
  batchAIProcessor,
];

// Export count for logging/debugging
export const functionCount = allFunctions.length;
console.log(`🚀 Inngest: Loaded ${functionCount} functions`);