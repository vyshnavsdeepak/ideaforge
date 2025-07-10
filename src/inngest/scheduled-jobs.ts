import { inngest } from "@/shared/services/inngest";
import { prisma } from "@/shared/services/prisma";
import { getActiveSubreddits } from "@/reddit";

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
    console.log('[PEAK_SCRAPER] Starting peak activity scraping...');
    
    const prioritySubreddits = await step.run("get-priority-subreddits", async () => {
      const activeSubreddits = await getActiveSubreddits();
      return activeSubreddits.filter(sub => sub.priority === 'high').map(sub => sub.name);
    });

    console.log(`[PEAK_SCRAPER] Found ${prioritySubreddits.length} high priority subreddits`);
    
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
    
    const activeSubreddits = await step.run("get-active-subreddits", async () => {
      const subreddits = await getActiveSubreddits();
      return subreddits.map(sub => ({ name: sub.name, maxPosts: sub.maxPosts }));
    });

    console.log(`[DAILY_SCRAPER] Found ${activeSubreddits.length} active subreddits`);
    
    await step.run("trigger-comprehensive-scraping", async () => {
      for (const subreddit of activeSubreddits) {
        await inngest.send({
          name: "reddit/scrape.subreddit",
          data: { 
            subreddit: subreddit.name,
            limit: Math.max(subreddit.maxPosts, 100), // Use configured max or 100, whichever is higher
            priority: 'normal'
          }
        });
      }
    });

    return { scrapedSubreddits: activeSubreddits.length };
  }
);

// Real-time hot content scraping (every 10 minutes)
export const realTimeHotScraper = inngest.createFunction(
  { id: "real-time-hot-scraper" },
  { cron: "*/10 * * * *" }, // Every 10 minutes
  async ({ step }) => {
    const hotContentSubreddits = await step.run("get-hot-content-subreddits", async () => {
      const activeSubreddits = await getActiveSubreddits();
      // Focus on business-related subreddits for real-time hot content
      return activeSubreddits.filter(sub => 
        sub.category === 'Business' || 
        ['entrepreneur', 'startups', 'business'].includes(sub.name)
      ).map(sub => sub.name);
    });

    console.log(`[REALTIME_SCRAPER] Starting real-time hot content scraping for ${hotContentSubreddits.length} subreddits...`);
    
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
    const weekendSubreddits = await step.run("get-weekend-subreddits", async () => {
      const activeSubreddits = await getActiveSubreddits();
      // Focus on business and project-related subreddits for weekend discovery
      return activeSubreddits.filter(sub => 
        sub.category === 'Business' || 
        ['entrepreneur', 'startups', 'smallbusiness', 'business', 'SideProject', 'EntrepreneurRideAlong'].includes(sub.name)
      ).map(sub => sub.name);
    });

    console.log(`[WEEKEND_SCRAPER] Starting weekend opportunity discovery for ${weekendSubreddits.length} subreddits...`);
    
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

    const devSubreddits = await step.run("get-dev-subreddits", async () => {
      const activeSubreddits = await getActiveSubreddits();
      // Use high priority subreddits for development testing
      return activeSubreddits.filter(sub => sub.priority === 'high').slice(0, 2).map(sub => sub.name);
    });
    
    console.log(`[DEV_SCRAPER] Starting development mode scraping for ${devSubreddits.length} subreddits...`);
    
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

// Batch AI processor (runs every 5 minutes to process unprocessed posts)
export const batchAIProcessor = inngest.createFunction(
  { id: "batch-ai-processor" },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    console.log('[BATCH_AI_PROCESSOR] Starting batch AI processing for unprocessed posts');
    
    // Find all unprocessed posts
    const unprocessedPosts = await step.run("find-unprocessed-posts", async () => {
      const posts = await prisma.redditPost.findMany({
        where: {
          processedAt: null,
          processingError: null,
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100, // Process up to 100 posts at a time
      });
      
      console.log(`[BATCH_AI_PROCESSOR] Found ${posts.length} unprocessed posts`);
      return posts;
    });
    
    if (unprocessedPosts.length === 0) {
      console.log('[BATCH_AI_PROCESSOR] No unprocessed posts found');
      return { processed: 0, message: 'No unprocessed posts found' };
    }
    
    // Process posts in efficient batches regardless of subreddit
    const batchSize = 25; // Process 25 posts per batch
    const results = await step.run("process-efficient-batches", async () => {
      const batchResults = [];
      
      for (let i = 0; i < unprocessedPosts.length; i += batchSize) {
        const batch = unprocessedPosts.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        console.log(`[BATCH_AI_PROCESSOR] Processing batch ${batchNumber} with ${batch.length} posts`);
        
        try {
          // Send batch analysis event
          const batchEvent = await inngest.send({
            name: "ai/batch-analyze.opportunities",
            data: {
              subreddit: "mixed", // Indicate this is a mixed batch
              posts: batch.map(post => ({
                postId: post.id,
                postTitle: post.title,
                postContent: post.content || '',
                subreddit: post.subreddit,
                author: post.author,
                score: post.score,
                numComments: post.numComments,
              })),
              triggeredBy: "scheduled-batch-processor",
              batchInfo: {
                batchNumber,
                totalBatches: Math.ceil(unprocessedPosts.length / batchSize),
                postsInBatch: batch.length,
                totalPosts: unprocessedPosts.length,
                isMixedSubreddits: true,
                timestamp: new Date().toISOString(),
              }
            }
          });
          
          batchResults.push({
            batchNumber,
            postsQueued: batch.length,
            eventId: batchEvent.ids[0],
            success: true,
          });
          
          console.log(`[BATCH_AI_PROCESSOR] Queued batch ${batchNumber} with ${batch.length} posts for analysis`);
        } catch (error) {
          console.error(`[BATCH_AI_PROCESSOR] Failed to queue batch ${batchNumber}:`, error);
          batchResults.push({
            batchNumber,
            postsQueued: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
          });
        }
      }
      
      return batchResults;
    });
    
    const totalProcessed = results.reduce((sum, result) => sum + (result.postsQueued || 0), 0);
    const successfulBatches = results.filter(r => r.success).length;
    
    console.log(`[BATCH_AI_PROCESSOR] Completed: ${totalProcessed} posts queued in ${successfulBatches} batches`);
    
    return {
      processed: totalProcessed,
      batchesTriggered: results.length,
      successfulBatches,
      results,
    };
  }
);

// Historical recovery scraping (for data recovery - goes back 1 year)
export const historicalRecoveryScraper = inngest.createFunction(
  { id: "historical-recovery-scraper" },
  { event: "reddit/scrape.historical-recovery" },
  async ({ event, step }) => {
    const { forceRecovery = false } = event.data;
    console.log(`[HISTORICAL_RECOVERY] Force recovery mode: ${forceRecovery}`);
    
    console.log('[HISTORICAL_RECOVERY] Starting historical recovery scraping...');
    
    const activeSubreddits = await step.run("get-active-subreddits", async () => {
      const subreddits = await getActiveSubreddits();
      return subreddits.map(sub => ({ name: sub.name, maxPosts: sub.maxPosts }));
    });

    console.log(`[HISTORICAL_RECOVERY] Found ${activeSubreddits.length} active subreddits for historical recovery`);
    
    // For historical recovery, we need to go back 1 year and ignore cursors
    await step.run("trigger-historical-scraping", async () => {
      for (const subreddit of activeSubreddits) {
        // Send multiple scraping jobs to get comprehensive historical data
        // We'll scrape hot, new, and top posts for each subreddit
        const scrapeTypes = ['hot', 'new', 'top'];
        
        for (const sortType of scrapeTypes) {
          await inngest.send({
            name: "reddit/scrape.subreddit",
            data: { 
              subreddit: subreddit.name,
              limit: 100, // Reddit API maximum limit per request
              sort: sortType,
              priority: 'recovery',
              historical: true, // Flag to ignore cursor and go back in time
              timeframe: '1year' // Go back 1 year
            }
          });
        }
      }
    });

    const totalJobs = activeSubreddits.length * 3; // 3 sort types per subreddit
    
    console.log(`[HISTORICAL_RECOVERY] Triggered ${totalJobs} historical scraping jobs`);
    
    return { 
      scrapedSubreddits: activeSubreddits.length,
      totalJobs,
      message: 'Historical recovery scraping initiated - this will take time to complete'
    };
  }
);

// Daily opportunity clustering (4 PM EST = 2:30 AM IST next day)
export const dailyOpportunityClustering = inngest.createFunction(
  { id: "daily-opportunity-clustering" },
  { cron: "0 16 * * *" }, // Daily at 4 PM EST
  async ({ step }) => {
    console.log('[DAILY_CLUSTERING] Starting daily opportunity clustering...');
    
    // Check if we have enough opportunities to cluster
    const opportunityCount = await step.run("check-opportunity-count", async () => {
      const count = await prisma.opportunity.count();
      console.log(`[DAILY_CLUSTERING] Found ${count} opportunities to analyze`);
      return count;
    });

    if (opportunityCount < 10) {
      console.log('[DAILY_CLUSTERING] Not enough opportunities for clustering (minimum 10)');
      return { skipped: true, reason: 'Insufficient opportunities', count: opportunityCount };
    }

    // Trigger clustering analysis
    await step.run("trigger-clustering", async () => {
      await inngest.send({
        name: "opportunities/cluster",
        data: { 
          forceRecalculate: true,
          triggeredBy: 'daily-schedule'
        }
      });
    });

    console.log('[DAILY_CLUSTERING] Daily clustering job triggered');
    
    return { 
      success: true,
      opportunityCount,
      message: 'Daily opportunity clustering initiated'
    };
  }
);

// Weekly comprehensive clustering (Sundays at 3 PM EST = 1:30 AM IST Monday)
export const weeklyComprehensiveClustering = inngest.createFunction(
  { id: "weekly-comprehensive-clustering" },
  { cron: "0 15 * * 0" }, // Weekly on Sundays at 3 PM EST
  async ({ step }) => {
    console.log('[WEEKLY_CLUSTERING] Starting weekly comprehensive clustering...');
    
    // Get clustering metrics before analysis
    const beforeMetrics = await step.run("get-before-metrics", async () => {
      const totalOpportunities = await prisma.opportunity.count();
      const clustersCount = await prisma.marketDemandCluster.count();
      
      return {
        totalOpportunities,
        clustersCount,
        timestamp: new Date().toISOString()
      };
    });

    // Trigger comprehensive clustering with force recalculation
    await step.run("trigger-comprehensive-clustering", async () => {
      await inngest.send({
        name: "opportunities/cluster",
        data: { 
          forceRecalculate: true,
          triggeredBy: 'weekly-comprehensive-schedule'
        }
      });
    });

    console.log('[WEEKLY_CLUSTERING] Weekly comprehensive clustering job triggered');
    
    return { 
      success: true,
      beforeMetrics,
      message: 'Weekly comprehensive clustering initiated'
    };
  }
);