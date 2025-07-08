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

// Serve Inngest functions with proper configuration for Vercel
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
  // Only use signing key if provided
  ...(process.env.INNGEST_SIGNING_KEY && { signingKey: process.env.INNGEST_SIGNING_KEY }),
  // Set the base URL for Vercel deployments
  servePath: "/api/inngest",
  // Enable streaming for better performance
  streaming: "allow",
});