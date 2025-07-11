import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const postsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).optional(),
      limit: z.number().min(1).max(100).optional(),
      subreddit: z.string().optional(),
      status: z.enum(['processed', 'unprocessed', 'failed', 'opportunity', 'rejected']).optional(),
      search: z.string().optional(),
      sortBy: z.enum(['createdAt', 'createdUtc', 'score', 'numComments']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      author: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const {
        page = 1,
        limit = 20,
        subreddit,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        author,
      } = input;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {};

      if (subreddit) {
        where.subreddit = subreddit;
      }

      if (author) {
        where.author = { contains: author, mode: 'insensitive' };
      }

      if (status) {
        switch (status) {
          case 'processed':
            where.processedAt = { not: null };
            break;
          case 'unprocessed':
            where.processedAt = null;
            break;
          case 'failed':
            where.processingError = { not: null };
            break;
          case 'opportunity':
            where.isOpportunity = true;
            break;
          case 'rejected':
            where.isOpportunity = false;
            break;
        }
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy clause
      const orderBy: Record<string, string> = {};
      orderBy[sortBy] = sortOrder;

      // Fetch posts with related opportunities
      const [posts, totalCount] = await Promise.all([
        ctx.prisma.redditPost.findMany({
          where,
          select: {
            id: true,
            redditId: true,
            title: true,
            content: true,
            author: true,
            subreddit: true,
            score: true,
            upvotes: true,
            downvotes: true,
            numComments: true,
            permalink: true,
            createdUtc: true,
            processedAt: true,
            processingError: true,
            isOpportunity: true,
            rejectionReasons: true,
            aiConfidence: true,
            aiAnalysisDate: true,
            commentAnalysisStatus: true,
            commentAnalysisJobId: true,
            commentAnalysisStarted: true,
            commentAnalysisCompleted: true,
            commentAnalysisError: true,
            commentOpportunitiesFound: true,
            createdAt: true,
            updatedAt: true,
            opportunitySources: {
              select: {
                id: true,
                confidence: true,
                sourceType: true,
                opportunity: {
                  select: {
                    id: true,
                    title: true,
                    overallScore: true,
                    viabilityThreshold: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        ctx.prisma.redditPost.count({ where }),
      ]);

      // Get summary statistics
      const stats = await Promise.all([
        ctx.prisma.redditPost.count(),
        ctx.prisma.redditPost.count({ where: { processedAt: { not: null } } }),
        ctx.prisma.redditPost.count({ where: { processedAt: null } }),
        ctx.prisma.redditPost.count({ where: { processingError: { not: null } } }),
        ctx.prisma.redditPost.count({ where: { isOpportunity: true } }),
        ctx.prisma.redditPost.count({ where: { isOpportunity: false } }),
      ]);

      const [totalPosts, processedPosts, unprocessedPosts, failedPosts, opportunityPosts, rejectedPosts] = stats;

      // Get available subreddits for filtering
      const subreddits = await ctx.prisma.redditPost.groupBy({
        by: ['subreddit'],
        _count: {
          subreddit: true,
        },
        orderBy: {
          _count: {
            subreddit: 'desc',
          },
        },
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        posts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        stats: {
          total: totalPosts,
          processed: processedPosts,
          unprocessed: unprocessedPosts,
          failed: failedPosts,
          opportunities: opportunityPosts,
          rejected: rejectedPosts,
        },
        subreddits: subreddits.map(s => ({
          name: s.subreddit,
          count: s._count.subreddit,
        })),
      };
    }),
});