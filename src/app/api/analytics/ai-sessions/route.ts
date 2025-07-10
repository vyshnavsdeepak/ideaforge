import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/shared';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sessionType = searchParams.get('type'); // batch, individual, fallback
    const subreddit = searchParams.get('subreddit');
    const includeDetails = searchParams.get('details') === 'true';

    // Build where clause
    const whereClause: {
      sessionType?: string;
      subreddit?: string;
    } = {};
    if (sessionType) {
      whereClause.sessionType = sessionType;
    }
    if (subreddit) {
      whereClause.subreddit = subreddit;
    }

    // Get AI analysis sessions
    const sessions = await prisma.aIAnalysisSession.findMany({
      where: whereClause,
      orderBy: {
        startTime: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        usageLogs: includeDetails,
        postAnalyses: includeDetails ? {
          take: 10, // Limit post analyses to avoid huge responses
          orderBy: {
            createdAt: 'desc',
          },
        } : false,
        _count: {
          select: {
            usageLogs: true,
            postAnalyses: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.aIAnalysisSession.count({
      where: whereClause,
    });

    // Calculate summary statistics
    const completedSessions = sessions.filter(s => s.endTime !== null);
    const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);
    const totalPosts = sessions.reduce((sum, s) => sum + s.postsProcessed, 0);
    const totalOpportunities = sessions.reduce((sum, s) => sum + s.opportunitiesFound, 0);

    // Format response
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      sessionType: session.sessionType,
      triggeredBy: session.triggeredBy,
      subreddit: session.subreddit,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() || null,
      duration: session.totalDuration,
      postsRequested: session.postsRequested,
      postsProcessed: session.postsProcessed,
      opportunitiesFound: session.opportunitiesFound,
      totalCost: Math.round(session.totalCost * 1000000) / 1000000,
      averageCostPerPost: Math.round(session.averageCostPerPost * 1000000) / 1000000,
      successRate: Math.round(session.successRate * 100) / 100,
      errorCount: session.errorCount,
      usageLogCount: session._count.usageLogs,
      postAnalysisCount: session._count.postAnalyses,
      ...(includeDetails && {
        usageLogs: session.usageLogs?.map(log => ({
          requestId: log.requestId,
          model: log.model,
          operation: log.operation,
          duration: log.duration,
          totalCost: Math.round(log.totalCost * 1000000) / 1000000,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          success: log.success,
          startTime: log.startTime.toISOString(),
        })),
        postAnalyses: session.postAnalyses?.map(analysis => ({
          id: analysis.id,
          postTitle: analysis.postTitle,
          subreddit: analysis.subreddit,
          model: analysis.model,
          totalCost: Math.round(analysis.totalCost * 1000000) / 1000000,
          isOpportunity: analysis.isOpportunity,
          confidence: analysis.confidence,
          overallScore: analysis.overallScore,
          success: analysis.success,
          processingTime: analysis.processingTime,
          createdAt: analysis.createdAt.toISOString(),
        })),
      }),
    }));

    const response = {
      sessions: formattedSessions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      summary: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        totalCost: Math.round(totalCost * 1000000) / 1000000,
        totalPosts,
        totalOpportunities,
        averageCostPerPost: totalPosts > 0 ? Math.round((totalCost / totalPosts) * 1000000) / 1000000 : 0,
        averageCostPerSession: sessions.length > 0 ? Math.round((totalCost / sessions.length) * 1000000) / 1000000 : 0,
        averageSuccessRate: sessions.length > 0 ? 
          Math.round((sessions.reduce((sum, s) => sum + s.successRate, 0) / sessions.length) * 100) / 100 : 0,
      },
      filters: {
        sessionType,
        subreddit,
        includeDetails,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Failed to get AI session analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get AI session analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const olderThan = searchParams.get('olderThan'); // ISO date string

    if (sessionId) {
      // Delete specific session
      await prisma.aIAnalysisSession.delete({
        where: { id: sessionId },
      });

      return NextResponse.json({
        success: true,
        message: `Session ${sessionId} deleted successfully`,
        timestamp: new Date().toISOString(),
      });
    }

    if (olderThan) {
      // Delete sessions older than specified date
      const deleteDate = new Date(olderThan);
      const deletedSessions = await prisma.aIAnalysisSession.deleteMany({
        where: {
          startTime: {
            lt: deleteDate,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `${deletedSessions.count} sessions deleted`,
        deletedCount: deletedSessions.count,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Either sessionId or olderThan parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Failed to delete AI sessions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete AI sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}