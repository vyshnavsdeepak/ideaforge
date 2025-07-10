import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/shared/services/prisma';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check what data we have
    const [
      usageLogCount,
      dailyUsageCount,
      analysisSessionCount,
      postAnalysisCount,
      modelUsageCount,
      recentUsageLogs,
      recentDailyUsage,
    ] = await Promise.all([
      prisma.aIUsageLog.count(),
      prisma.aIDailyUsage.count(),
      prisma.aIAnalysisSession.count(),
      prisma.aIPostAnalysis.count(),
      prisma.aIModelUsage.count(),
      prisma.aIUsageLog.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        select: {
          requestId: true,
          model: true,
          operation: true,
          startTime: true,
          totalCost: true,
          inputTokens: true,
          outputTokens: true,
          success: true,
        },
      }),
      prisma.aIDailyUsage.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          date: true,
          totalCost: true,
          totalRequests: true,
          postsAnalyzed: true,
          opportunitiesFound: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      debug: {
        tableRowCounts: {
          usageLogCount,
          dailyUsageCount,
          analysisSessionCount,
          postAnalysisCount,
          modelUsageCount,
        },
        recentData: {
          recentUsageLogs,
          recentDailyUsage,
        },
        message: usageLogCount === 0 
          ? 'No AI usage data found. This suggests cost tracking is not being used during analysis.'
          : `Found ${usageLogCount} usage logs and ${dailyUsageCount} daily aggregations.`,
      },
    });
  } catch (error) {
    console.error('Error debugging AI costs:', error);
    return NextResponse.json(
      { error: 'Failed to debug AI costs' },
      { status: 500 }
    );
  }
}