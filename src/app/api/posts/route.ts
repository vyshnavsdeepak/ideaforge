import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/services/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const subreddit = searchParams.get('subreddit');
    const status = searchParams.get('status'); // 'processed', 'unprocessed', 'failed'
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (subreddit) {
      where.subreddit = subreddit;
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
      prisma.redditPost.findMany({
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
      prisma.redditPost.count({ where }),
    ]);

    // Calculate processing status for each post
    const postsWithStatus = posts.map(post => {
      const opportunities = post.opportunitySources.map(src => src.opportunity);
      return {
        ...post,
        status: getProcessingStatus(post),
        opportunityCount: opportunities.length,
        viableOpportunityCount: opportunities.filter(opp => opp.viabilityThreshold).length,
        opportunities: opportunities, // Add opportunities for UI compatibility
      };
    });

    // Get summary statistics
    const stats = await Promise.all([
      prisma.redditPost.count(),
      prisma.redditPost.count({ where: { processedAt: { not: null } } }),
      prisma.redditPost.count({ where: { processedAt: null } }),
      prisma.redditPost.count({ where: { processingError: { not: null } } }),
      prisma.redditPost.count({ where: { isOpportunity: true } }),
      prisma.redditPost.count({ where: { isOpportunity: false } }),
    ]);

    const [totalPosts, processedPosts, unprocessedPosts, failedPosts, opportunityPosts, rejectedPosts] = stats;

    // Get available subreddits for filtering
    const subreddits = await prisma.redditPost.groupBy({
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

    return NextResponse.json({
      success: true,
      data: {
        posts: postsWithStatus,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
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
      },
    });
  } catch (error) {
    console.error('Error fetching Reddit posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Reddit posts' },
      { status: 500 }
    );
  }
}

function getProcessingStatus(post: { processingError: string | null; processedAt: Date | null; createdAt: Date }): 'processed' | 'unprocessed' | 'failed' | 'processing' {
  if (post.processingError) {
    return 'failed';
  }
  if (post.processedAt) {
    return 'processed';
  }
  // Check if post was recently scraped but not yet processed (within last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (post.createdAt > fiveMinutesAgo && !post.processedAt) {
    return 'processing';
  }
  return 'unprocessed';
}