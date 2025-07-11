import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const opportunitiesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      subreddit: z.string().optional(),
      businessType: z.string().optional(),
      platform: z.string().optional(),
      targetAudience: z.string().optional(),
      industryVertical: z.string().optional(),
      niche: z.string().optional(),
      minScore: z.number().min(0).max(10).optional(),
      viability: z.enum(['all', 'viable', 'not_viable']).optional(),
      sortBy: z.enum(['overallScore', 'createdAt', 'title', 'subreddit', 'businessType', 'deltaScore']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      page: z.number().min(1).optional(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const {
        search,
        subreddit,
        businessType,
        platform,
        targetAudience,
        industryVertical,
        niche,
        minScore = 0,
        viability = 'all',
        sortBy = 'overallScore',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
      } = input;

      // Build where clause for filtering
      const whereClause: Record<string, unknown> = {};

      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { proposedSolution: { contains: search, mode: 'insensitive' } },
          { businessType: { contains: search, mode: 'insensitive' } },
          { niche: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (subreddit) {
        whereClause.subreddit = subreddit;
      }

      if (businessType) {
        whereClause.businessType = businessType;
      }

      if (platform) {
        whereClause.platform = platform;
      }

      if (targetAudience) {
        whereClause.targetAudience = targetAudience;
      }

      if (industryVertical) {
        whereClause.industryVertical = industryVertical;
      }

      if (niche) {
        whereClause.niche = niche;
      }

      if (minScore > 0) {
        whereClause.overallScore = { gte: minScore };
      }

      if (viability === 'viable') {
        whereClause.viabilityThreshold = true;
      } else if (viability === 'not_viable') {
        whereClause.viabilityThreshold = false;
      }

      // Build order clause
      const orderClause = [
        { [sortBy]: sortOrder },
        { sourceCount: 'desc' as const }, // Default secondary sort
      ];

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get opportunities with related data and total count
      const [opportunities, totalCount] = await Promise.all([
        ctx.prisma.opportunity.findMany({
          where: whereClause,
          select: {
            id: true,
            title: true,
            description: true,
            currentSolution: true,
            proposedSolution: true,
            marketContext: true,
            implementationNotes: true,
            speedScore: true,
            convenienceScore: true,
            trustScore: true,
            priceScore: true,
            statusScore: true,
            predictabilityScore: true,
            uiUxScore: true,
            easeOfUseScore: true,
            legalFrictionScore: true,
            emotionalComfortScore: true,
            overallScore: true,
            viabilityThreshold: true,
            subreddit: true,
            marketSize: true,
            complexity: true,
            successProbability: true,
            businessType: true,
            businessModel: true,
            revenueModel: true,
            platform: true,
            targetAudience: true,
            industryVertical: true,
            niche: true,
            createdAt: true,
            updatedAt: true,
            sourceCount: true,
            makeshiftSolution: true,
            softwareSolution: true,
            deltaComparison: true,
            redditPosts: {
              select: {
                id: true,
                sourceType: true,
                confidence: true,
                redditPost: {
                  select: {
                    id: true,
                    title: true,
                    author: true,
                    score: true,
                    upvotes: true,
                    downvotes: true,
                    numComments: true,
                    permalink: true,
                    subreddit: true,
                    createdUtc: true,
                  },
                },
              },
            },
          },
          orderBy: orderClause,
          skip,
          take: limit,
        }),
        ctx.prisma.opportunity.count({ where: whereClause }),
      ]);

      // Get summary statistics
      const stats = await Promise.all([
        ctx.prisma.opportunity.count(),
        ctx.prisma.opportunity.count({ where: { viabilityThreshold: true } }),
        ctx.prisma.opportunity.aggregate({ _avg: { overallScore: true } }),
      ]);

      const [totalOpportunities, viableOpportunities, avgScoreResult] = stats;

      // Get available filter options
      const filterOptions = await Promise.all([
        ctx.prisma.opportunity.groupBy({ by: ['subreddit'], _count: { subreddit: true }, orderBy: { _count: { subreddit: 'desc' } } }),
        ctx.prisma.opportunity.groupBy({ by: ['businessType'], _count: { businessType: true }, where: { businessType: { not: null } }, orderBy: { _count: { businessType: 'desc' } } }),
        ctx.prisma.opportunity.groupBy({ by: ['platform'], _count: { platform: true }, where: { platform: { not: null } }, orderBy: { _count: { platform: 'desc' } } }),
        ctx.prisma.opportunity.groupBy({ by: ['targetAudience'], _count: { targetAudience: true }, where: { targetAudience: { not: null } }, orderBy: { _count: { targetAudience: 'desc' } } }),
        ctx.prisma.opportunity.groupBy({ by: ['industryVertical'], _count: { industryVertical: true }, where: { industryVertical: { not: null } }, orderBy: { _count: { industryVertical: 'desc' } } }),
        ctx.prisma.opportunity.groupBy({ by: ['niche'], _count: { niche: true }, where: { niche: { not: null } }, orderBy: { _count: { niche: 'desc' } } }),
      ]);

      const [subreddits, businessTypes, platforms, targetAudiences, industryVerticals, niches] = filterOptions;

      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      return {
        opportunities,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore,
        },
        stats: {
          total: totalOpportunities,
          viable: viableOpportunities,
          avgScore: avgScoreResult._avg.overallScore || 0,
        },
        filters: {
          search,
          subreddit,
          businessType,
          platform,
          targetAudience,
          industryVertical,
          niche,
          minScore,
          viability,
          sortBy,
          sortOrder,
          subreddits: subreddits.map(s => s.subreddit),
          businessTypes: businessTypes.map(b => b.businessType!),
          platforms: platforms.map(p => p.platform!),
          targetAudiences: targetAudiences.map(t => t.targetAudience!),
          industryVerticals: industryVerticals.map(i => i.industryVertical!),
          niches: niches.map(n => n.niche!),
        },
      };
    }),
});