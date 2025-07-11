import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { inngest } from '@/shared/services/inngest';

export const jobsRouter = createTRPCRouter({
  triggerScraping: protectedProcedure
    .input(z.object({
      subreddits: z.array(z.string()).optional(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const { subreddits, limit } = input;
      
      if (subreddits && subreddits.length > 0) {
        // Trigger scraping for specific subreddits
        const events = await Promise.all(
          subreddits.map(subreddit =>
            inngest.send({
              name: 'reddit/scrape.subreddit',
              data: { subreddit, limit: limit || 25, priority: 'manual' },
            })
          )
        );
        
        return {
          success: true,
          message: `Triggered scraping for ${subreddits.length} subreddits`,
          events: events.map(e => ({ id: e.ids[0], subreddit: subreddits[events.indexOf(e)] }))
        };
      } else {
        // Trigger scraping for all active subreddits
        const event = await inngest.send({
          name: 'reddit/scrape.all',
          data: { limit: limit || 25 },
        });
        
        return {
          success: true,
          message: 'Triggered scraping for all active subreddits',
          eventId: event.ids[0]
        };
      }
    }),

  processUnprocessedPosts: protectedProcedure.mutation(async ({ ctx }) => {
    // Get unprocessed posts
    const unprocessedPosts = await ctx.prisma.redditPost.findMany({
      where: { processedAt: null },
      select: { id: true, title: true, subreddit: true },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });

    if (unprocessedPosts.length === 0) {
      return {
        success: true,
        message: 'No unprocessed posts found',
        processed: 0
      };
    }

    // Trigger AI processing
    const event = await inngest.send({
      name: 'ai/batch.process',
      data: {
        postIds: unprocessedPosts.map(p => p.id),
        source: 'manual-trigger',
        forceProcessing: true
      },
    });

    return {
      success: true,
      message: `Processing ${unprocessedPosts.length} posts`,
      processed: unprocessedPosts.length,
      eventId: event.ids[0]
    };
  }),

  forceBatchAI: protectedProcedure.mutation(async ({ ctx }) => {
    // Get recent unprocessed posts
    const recentPosts = await ctx.prisma.redditPost.findMany({
      where: {
        processedAt: null,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: { id: true, subreddit: true },
      orderBy: { createdAt: 'desc' }
    });

    if (recentPosts.length === 0) {
      return {
        success: true,
        message: 'No recent unprocessed posts found',
        processed: 0
      };
    }

    // Group by subreddit for better tracking
    const postsBySubreddit = recentPosts.reduce((acc, post) => {
      acc[post.subreddit] = (acc[post.subreddit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Trigger batch processing
    const event = await inngest.send({
      name: 'ai/batch.process',
      data: {
        postIds: recentPosts.map(p => p.id),
        source: 'force-batch',
        metadata: { postsBySubreddit }
      },
    });

    return {
      success: true,
      message: `Force processing ${recentPosts.length} recent posts`,
      processed: recentPosts.length,
      breakdown: postsBySubreddit,
      eventId: event.ids[0]
    };
  }),

  clearCache: protectedProcedure.mutation(async () => {
    // This would clear any caches if we had them
    // For now, just return success
    return {
      success: true,
      message: 'Cache cleared successfully'
    };
  }),
});