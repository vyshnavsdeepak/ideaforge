import { inngest } from "../lib/inngest";
import { TARGET_SUBREDDITS } from "../lib/reddit";

/**
 * Scheduled Reddit scraping jobs based on optimal timing:
 * 
 * Peak Activity Window: 9 AM - 1 PM EST (6:30 PM - 10:30 PM IST)
 * - Best for trending content and high engagement posts
 * - US time zones dominate Reddit traffic
 * 
 * Daily Knowledge Base: 2 PM EST (12:30 AM IST next day)
 * - After global content has time to accumulate
 * - Good for comprehensive subreddit coverage
 */

// Peak activity scraping (every 30 minutes during peak hours)
export const peakActivityScraper = inngest.createFunction(
  { id: "peak-activity-scraper" },
  { cron: "0,30 9-13 * * *" }, // Every 30 minutes from 9 AM to 1 PM EST
  async ({ step }) => {
    const prioritySubreddits = [
      'entrepreneur',
      'startups', 
      'smallbusiness',
      'business',
      'SaaS'
    ];

    console.log('[PEAK_SCRAPER] Starting peak activity scraping...');
    
    await step.run("trigger-priority-scraping", async () => {
      for (const subreddit of prioritySubreddits) {
        await inngest.send({
          name: "reddit/scrape.subreddit",
          data: { 
            subreddit,
            limit: 50, // Higher limit during peak hours
            priority: 'high'
          }
        });
      }
    });

    return { scrapedSubreddits: prioritySubreddits.length };
  }
);

// Daily comprehensive scraping (2 PM EST = 12:30 AM IST next day)
export const dailyComprehensiveScraper = inngest.createFunction(
  { id: "daily-comprehensive-scraper" },
  { cron: "0 14 * * *" }, // 2 PM EST daily
  async ({ step }) => {
    console.log('[DAILY_SCRAPER] Starting daily comprehensive scraping...');
    
    await step.run("trigger-comprehensive-scraping", async () => {
      for (const subreddit of TARGET_SUBREDDITS) {
        await inngest.send({
          name: "reddit/scrape.subreddit",
          data: { 
            subreddit,
            limit: 100, // Comprehensive scraping
            priority: 'normal'
          }
        });
      }
    });

    return { scrapedSubreddits: TARGET_SUBREDDITS.length };
  }
);

// Real-time hot content scraping (every 10 minutes)
export const realTimeHotScraper = inngest.createFunction(
  { id: "real-time-hot-scraper" },
  { cron: "*/10 * * * *" }, // Every 10 minutes
  async ({ step }) => {
    const hotContentSubreddits = [
      'entrepreneur',
      'startups',
      'business'
    ];

    console.log('[REALTIME_SCRAPER] Starting real-time hot content scraping...');
    
    await step.run("trigger-hot-content-scraping", async () => {
      for (const subreddit of hotContentSubreddits) {
        await inngest.send({
          name: "reddit/scrape.subreddit",
          data: { 
            subreddit,
            limit: 25,
            sort: 'hot', // Focus on hot posts
            priority: 'realtime'
          }
        });
      }
    });

    return { scrapedSubreddits: hotContentSubreddits.length };
  }
);

// Weekend opportunity discovery (Saturdays at 10 AM EST)
export const weekendOpportunityDiscovery = inngest.createFunction(
  { id: "weekend-opportunity-discovery" },
  { cron: "0 10 * * 6" }, // Saturdays at 10 AM EST
  async ({ step }) => {
    const weekendSubreddits = [
      'entrepreneur',
      'startups',
      'smallbusiness',
      'business',
      'SideProject',
      'EntrepreneurRideAlong'
    ];

    console.log('[WEEKEND_SCRAPER] Starting weekend opportunity discovery...');
    
    await step.run("trigger-weekend-scraping", async () => {
      for (const subreddit of weekendSubreddits) {
        await inngest.send({
          name: "reddit/scrape.subreddit",
          data: { 
            subreddit,
            limit: 75,
            sort: 'top', // Focus on top posts for quality
            priority: 'weekend'
          }
        });
      }
    });

    return { scrapedSubreddits: weekendSubreddits.length };
  }
);

/**
 * Development mode scraping (runs every 2 hours during dev)
 * Only active when NODE_ENV !== 'production'
 */
export const devModeScraper = inngest.createFunction(
  { id: "dev-mode-scraper" },
  { cron: "0 */2 * * *" }, // Every 2 hours
  async ({ step }) => {
    // Only run in development
    if (process.env.NODE_ENV === 'production') {
      console.log('[DEV_SCRAPER] Skipping dev scraper in production');
      return { skipped: true };
    }

    const devSubreddits = ['entrepreneur', 'startups'];
    
    console.log('[DEV_SCRAPER] Starting development mode scraping...');
    
    await step.run("trigger-dev-scraping", async () => {
      for (const subreddit of devSubreddits) {
        await inngest.send({
          name: "reddit/scrape.subreddit",
          data: { 
            subreddit,
            limit: 10, // Smaller limit for development
            priority: 'dev'
          }
        });
      }
    });

    return { scrapedSubreddits: devSubreddits.length };
  }
);