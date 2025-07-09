import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[SYSTEM_HEALTH] Starting system health check');

    // Database health check
    const dbHealth = await checkDatabaseHealth();
    
    // Reddit posts health check
    const postsHealth = await checkPostsHealth();
    
    // AI cost tracking health check
    const aiCostHealth = await checkAICostHealth();
    
    // Opportunities health check
    const opportunitiesHealth = await checkOpportunitiesHealth();

    const overallHealth = dbHealth.status === 'healthy' && 
                         postsHealth.status === 'healthy' && 
                         aiCostHealth.status === 'healthy' && 
                         opportunitiesHealth.status === 'healthy';

    const response = {
      status: overallHealth ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        posts: postsHealth,
        aiCost: aiCostHealth,
        opportunities: opportunitiesHealth,
      },
    };

    console.log('[SYSTEM_HEALTH] Health check completed:', response.status);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[SYSTEM_HEALTH] Error during health check:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to perform system health check',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function checkDatabaseHealth() {
  try {
    // Test basic database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'healthy',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkPostsHealth() {
  try {
    const [totalPosts, processedPosts, unprocessedPosts, failedPosts] = await Promise.all([
      prisma.redditPost.count(),
      prisma.redditPost.count({ where: { processedAt: { not: null } } }),
      prisma.redditPost.count({ where: { processedAt: null, processingError: null } }),
      prisma.redditPost.count({ where: { processingError: { not: null } } }),
    ]);

    const processingRate = totalPosts > 0 ? (processedPosts / totalPosts) * 100 : 0;
    const failureRate = totalPosts > 0 ? (failedPosts / totalPosts) * 100 : 0;

    return {
      status: failureRate > 20 ? 'warning' : 'healthy',
      message: `${totalPosts} total posts, ${processingRate.toFixed(1)}% processed, ${failureRate.toFixed(1)}% failed`,
      metrics: {
        total: totalPosts,
        processed: processedPosts,
        unprocessed: unprocessedPosts,
        failed: failedPosts,
        processingRate: Math.round(processingRate),
        failureRate: Math.round(failureRate),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check posts health',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkAICostHealth() {
  try {
    const [totalUsage, totalSessions, totalPostAnalysis] = await Promise.all([
      prisma.aIUsageLog.count(),
      prisma.aIAnalysisSession.count(),
      prisma.aIPostAnalysis.count(),
    ]);

    const recentUsage = await prisma.aIUsageLog.count({
      where: {
        startTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    return {
      status: 'healthy',
      message: `AI cost tracking active: ${totalUsage} total usage logs, ${recentUsage} in last 24h`,
      metrics: {
        totalUsage,
        totalSessions,
        totalPostAnalysis,
        recentUsage,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check AI cost health',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkOpportunitiesHealth() {
  try {
    const [totalOpportunities, viableOpportunities, avgScore] = await Promise.all([
      prisma.opportunity.count(),
      prisma.opportunity.count({ where: { viabilityThreshold: true } }),
      prisma.opportunity.aggregate({ _avg: { overallScore: true } }),
    ]);

    const viabilityRate = totalOpportunities > 0 ? (viableOpportunities / totalOpportunities) * 100 : 0;
    const averageScore = avgScore._avg.overallScore || 0;

    return {
      status: 'healthy',
      message: `${totalOpportunities} opportunities, ${viabilityRate.toFixed(1)}% viable, avg score ${averageScore.toFixed(2)}`,
      metrics: {
        total: totalOpportunities,
        viable: viableOpportunities,
        viabilityRate: Math.round(viabilityRate),
        averageScore: Math.round(averageScore * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check opportunities health',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}