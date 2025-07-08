import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest";
import { 
  scrapeSubreddit, 
  analyzeOpportunity, 
  dailyRedditScrape 
} from "../../../inngest/functions";
import {
  peakActivityScraper,
  dailyComprehensiveScraper,
  realTimeHotScraper,
  weekendOpportunityDiscovery,
  devModeScraper
} from "../../../inngest/scheduled-jobs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Core functions
    scrapeSubreddit,
    analyzeOpportunity,
    dailyRedditScrape,
    
    // Scheduled jobs
    peakActivityScraper,
    dailyComprehensiveScraper,
    realTimeHotScraper,
    weekendOpportunityDiscovery,
    devModeScraper,
  ],
});