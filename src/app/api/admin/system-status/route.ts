import { NextResponse } from 'next/server';
import { prisma } from '@/shared/services/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { createRedditClient } from '@/reddit';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check database health
    let databaseHealth: 'online' | 'offline' | 'degraded' = 'offline';
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseHealth = 'online';
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check Reddit API health
    let redditHealth: 'online' | 'offline' | 'degraded' = 'offline';
    try {
      const client = createRedditClient();
      // Try to fetch a small subreddit to test connectivity
      await client.fetchSubredditPosts('test', 'hot', 1);
      redditHealth = 'online';
    } catch (error) {
      console.error('Reddit health check failed:', error);
    }

    // Check Gemini AI health (we'll assume it's online if we can import the module)
    let geminiHealth: 'online' | 'offline' | 'degraded' = 'online';
    try {
      // We can't easily test Gemini without making an actual API call
      // So we'll check if we have the API key configured
      if (!process.env.GOOGLE_AI_API_KEY) {
        geminiHealth = 'offline';
      }
    } catch (error) {
      console.error('Gemini health check failed:', error);
      geminiHealth = 'offline';
    }

    // Get job metrics from the database
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get posts processing metrics
    const [
      totalPosts,
      processedPosts,
      unprocessedPosts,
      failedPosts,
      recentOpportunities
    ] = await Promise.all([
      prisma.redditPost.count(),
      prisma.redditPost.count({ where: { processedAt: { not: null } } }),
      prisma.redditPost.count({ where: { processedAt: null } }),
      prisma.redditPost.count({ where: { processingError: { not: null } } }),
      prisma.opportunity.count({ where: { createdAt: { gte: last24Hours } } })
    ]);

    // Get AI session metrics
    const aiSessions = await prisma.aIAnalysisSession.findMany({
      where: {
        startTime: { gte: last24Hours }
      },
      select: {
        postsProcessed: true,
        successRate: true,
        totalDuration: true,
        errorCount: true,
        sessionType: true,
        endTime: true,
        startTime: true
      }
    });

    // Calculate running jobs (sessions without endTime)
    const runningJobs = aiSessions.filter(s => !s.endTime).length;
    const completedJobs = aiSessions.filter(s => s.endTime).length;
    const failedJobs = aiSessions.filter(s => s.errorCount > 0).length;
    
    // Calculate average processing time
    const completedSessions = aiSessions.filter(s => s.endTime && s.totalDuration);
    const avgProcessingTime = completedSessions.length > 0
      ? Math.round(completedSessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0) / completedSessions.length / 1000)
      : 0;

    // Calculate success rate
    const totalProcessed = aiSessions.reduce((sum, s) => sum + s.postsProcessed, 0);
    const successfulProcessed = aiSessions.reduce((sum, s) => sum + Math.round(s.postsProcessed * (s.successRate / 100)), 0);
    const successRate = totalProcessed > 0 ? (successfulProcessed / totalProcessed) * 100 : 0;

    // Get current/recent jobs
    const currentJobs = await prisma.aIAnalysisSession.findMany({
      where: {
        OR: [
          { endTime: null }, // Running jobs
          { startTime: { gte: new Date(now.getTime() - 5 * 60 * 1000) } } // Jobs from last 5 minutes
        ]
      },
      select: {
        id: true,
        sessionType: true,
        subreddit: true,
        postsRequested: true,
        postsProcessed: true,
        startTime: true,
        endTime: true,
        totalCost: true
      },
      orderBy: { startTime: 'desc' },
      take: 10
    });

    // Get subreddit scraping status
    const subredditCursors = await prisma.subredditCursor.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        subreddit: true,
        postsProcessed: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      systemHealth: {
        database: databaseHealth,
        inngest: 'online', // We assume Inngest is online if we're running
        reddit: redditHealth,
        gemini: geminiHealth,
        lastChecked: new Date().toISOString()
      },
      jobMetrics: {
        totalJobs: aiSessions.length,
        runningJobs,
        completedJobs,
        failedJobs,
        averageProcessingTime: avgProcessingTime,
        successRate: successRate.toFixed(1)
      },
      postMetrics: {
        totalPosts,
        processedPosts,
        unprocessedPosts,
        failedPosts,
        recentOpportunities
      },
      currentJobs: currentJobs.map(job => ({
        id: job.id,
        type: job.sessionType,
        subreddit: job.subreddit,
        status: job.endTime ? 'completed' : 'running',
        progress: job.postsRequested > 0 ? (job.postsProcessed / job.postsRequested) * 100 : 0,
        postsProcessed: job.postsProcessed,
        postsRequested: job.postsRequested,
        startTime: job.startTime,
        endTime: job.endTime,
        cost: job.totalCost
      })),
      recentActivity: subredditCursors.map(cursor => ({
        subreddit: cursor.subreddit,
        postsProcessed: cursor.postsProcessed,
        lastUpdate: cursor.updatedAt
      }))
    });
  } catch (error) {
    console.error('System status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    );
  }
}