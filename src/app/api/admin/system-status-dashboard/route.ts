import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/shared';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[STATUS_DASHBOARD] Fetching comprehensive system status');

    // Fetch all data in parallel for performance
    const [
      totalPosts,
      unprocessedPosts,
      failedPosts,
      totalOpportunities,
      viableOpportunities,
      avgOpportunityScore,
      duplicatePosts,
      malformedUrls,
      nullContentPosts,
      recentAIUsage,
      totalAIUsage,
      recentSubredditCursor
    ] = await Promise.all([
      // Posts stats
      prisma.redditPost.count(),
      prisma.redditPost.count({
        where: {
          processedAt: null,
          processingError: null,
        }
      }),
      prisma.redditPost.count({
        where: {
          processingError: { not: null }
        }
      }),

      // Opportunities stats
      prisma.opportunity.count(),
      prisma.opportunity.count({
        where: { viabilityThreshold: true }
      }),
      prisma.opportunity.aggregate({
        _avg: { overallScore: true }
      }),

      // Data quality issues
      prisma.redditPost.groupBy({
        by: ['redditId'],
        having: {
          redditId: { _count: { gt: 1 } }
        },
        _count: { redditId: true }
      }),
      prisma.redditPost.count({
        where: {
          OR: [
            { url: { contains: 'reddit.com/r/' } },
            { url: { startsWith: '/r/' } },
            { permalink: { not: { startsWith: '/r/' } } }
          ]
        }
      }),
      prisma.redditPost.count({
        where: { content: null }
      }),

      // AI usage stats
      prisma.aIUsageLog.count({
        where: {
          startTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.aIUsageLog.count(),

      // Last scrape time
      prisma.subredditCursor.findFirst({
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    // Calculate data issues
    const duplicateCount = duplicatePosts.reduce((sum, dup) => sum + (dup._count.redditId - 1), 0);
    const totalDataIssues = duplicateCount + malformedUrls + nullContentPosts;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (unprocessedPosts > 50) {
      recommendations.push(`${unprocessedPosts} posts waiting for AI processing - click "Process All Unprocessed"`);
    }
    
    if (failedPosts > 10) {
      recommendations.push(`${failedPosts} posts failed processing - click "Retry Failed Posts"`);
    }
    
    if (totalDataIssues > 20) {
      recommendations.push(`${totalDataIssues} data integrity issues found - click "Fix Data Issues"`);
    }
    
    if (recentSubredditCursor && new Date(recentSubredditCursor.updatedAt).getTime() < Date.now() - 2 * 60 * 60 * 1000) {
      recommendations.push(`Last scrape was ${Math.round((Date.now() - new Date(recentSubredditCursor.updatedAt).getTime()) / (60 * 60 * 1000))} hours ago - click "Scrape All Subreddits"`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally - no immediate action needed');
    }

    // Determine overall health
    let health: 'healthy' | 'warning' | 'error' = 'healthy';
    
    if (failedPosts > 50 || totalDataIssues > 100 || unprocessedPosts > 200) {
      health = 'error';
    } else if (failedPosts > 10 || totalDataIssues > 20 || unprocessedPosts > 50) {
      health = 'warning';
    }

    // Estimate AI costs (rough calculation based on usage)
    const estimatedCostPerUsage = 0.001; // $0.001 per usage (rough estimate)
    const estimatedCost = totalAIUsage * estimatedCostPerUsage;

    const status = {
      posts: {
        total: totalPosts,
        unprocessed: unprocessedPosts,
        failed: failedPosts,
        lastScrape: recentSubredditCursor?.updatedAt?.toISOString(),
      },
      opportunities: {
        total: totalOpportunities,
        viable: viableOpportunities,
        avgScore: avgOpportunityScore._avg.overallScore || 0,
      },
      aiCosts: {
        totalUsage: totalAIUsage,
        recentUsage: recentAIUsage,
        estimatedCost,
      },
      dataIssues: {
        duplicates: duplicateCount,
        malformedUrls,
        nullContent: nullContentPosts,
        totalIssues: totalDataIssues,
      },
      health,
      recommendations,
      timestamp: new Date().toISOString(),
    };

    console.log('[STATUS_DASHBOARD] System status compiled:', {
      health,
      unprocessedPosts,
      failedPosts,
      totalDataIssues,
      recommendationCount: recommendations.length
    });

    return NextResponse.json(status);

  } catch (error) {
    console.error('[STATUS_DASHBOARD] Error fetching system status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch system status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}