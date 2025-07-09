import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';
import { aggregateDailyUsage, checkCostThresholds } from '../../../../lib/ai-cost-tracking';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d
    const breakdown = searchParams.get('breakdown') || 'daily'; // daily, weekly, monthly
    const includeDetails = searchParams.get('details') === 'true';

    const now = new Date();
    let startDate: Date;
    
    // Calculate start date based on period
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get daily usage data
    const dailyUsage = await prisma.aIDailyUsage.findMany({
      where: {
        date: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get model usage data
    const modelUsage = await prisma.aIModelUsage.findMany({
      where: {
        date: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Calculate summary metrics
    const totalCost = dailyUsage.reduce((sum, day) => sum + day.totalCost, 0);
    const totalRequests = dailyUsage.reduce((sum, day) => sum + day.totalRequests, 0);
    const totalTokens = dailyUsage.reduce((sum, day) => sum + day.totalTokens, 0);
    const totalPostsAnalyzed = dailyUsage.reduce((sum, day) => sum + day.postsAnalyzed, 0);
    const totalOpportunities = dailyUsage.reduce((sum, day) => sum + day.opportunitiesFound, 0);
    const averageSuccessRate = dailyUsage.length > 0 ? 
      dailyUsage.reduce((sum, day) => sum + day.successRate, 0) / dailyUsage.length : 0;

    // Calculate cost efficiency metrics
    const costPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
    const costPerPost = totalPostsAnalyzed > 0 ? totalCost / totalPostsAnalyzed : 0;
    const costPerOpportunity = totalOpportunities > 0 ? totalCost / totalOpportunities : 0;
    const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;

    // Calculate model breakdown
    const modelBreakdown = modelUsage.reduce((acc, usage) => {
      const model = usage.model;
      if (!acc[model]) {
        acc[model] = {
          totalCost: 0,
          totalRequests: 0,
          totalTokens: 0,
          successRate: 0,
          requestCount: 0,
        };
      }
      acc[model].totalCost += usage.totalCost;
      acc[model].totalRequests += usage.requestCount;
      acc[model].totalTokens += usage.totalTokens;
      acc[model].successRate += usage.successRate;
      acc[model].requestCount += 1;
      return acc;
    }, {} as Record<string, {
      totalCost: number;
      totalRequests: number;
      totalTokens: number;
      successRate: number;
      requestCount: number;
    }>);

    // Calculate average success rate for each model
    Object.keys(modelBreakdown).forEach(model => {
      if (modelBreakdown[model].requestCount > 0) {
        modelBreakdown[model].successRate = modelBreakdown[model].successRate / modelBreakdown[model].requestCount;
      }
    });

    // Get recent AI usage logs if details are requested
    type RecentLogType = {
      requestId: string;
      model: string;
      operation: string;
      startTime: Date;
      duration: number | null;
      totalCost: number;
      inputTokens: number;
      outputTokens: number;
      success: boolean;
      batchSize: number | null;
    };
    
    let recentLogs: RecentLogType[] = [];
    if (includeDetails) {
      recentLogs = await prisma.aIUsageLog.findMany({
        where: {
          startTime: {
            gte: startDate,
            lte: now,
          },
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 100,
        select: {
          requestId: true,
          model: true,
          operation: true,
          startTime: true,
          duration: true,
          totalCost: true,
          inputTokens: true,
          outputTokens: true,
          success: true,
          batchSize: true,
        },
      });
    }

    // Check current cost thresholds
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const thresholdCheck = await checkCostThresholds(todayStart);

    const response = {
      period,
      breakdown,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      summary: {
        totalCost: Math.round(totalCost * 1000000) / 1000000, // Round to 6 decimal places
        totalRequests,
        totalTokens,
        totalPostsAnalyzed,
        totalOpportunities,
        averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
        costPerRequest: Math.round(costPerRequest * 1000000) / 1000000,
        costPerPost: Math.round(costPerPost * 1000000) / 1000000,
        costPerOpportunity: Math.round(costPerOpportunity * 1000000) / 1000000,
        costPerToken: Math.round(costPerToken * 1000000) / 1000000,
      },
      dailyUsage: dailyUsage.map(day => ({
        date: day.date,
        totalCost: Math.round(day.totalCost * 1000000) / 1000000,
        totalRequests: day.totalRequests,
        successfulRequests: day.successfulRequests,
        failedRequests: day.failedRequests,
        totalTokens: day.totalTokens,
        postsAnalyzed: day.postsAnalyzed,
        opportunitiesFound: day.opportunitiesFound,
        successRate: Math.round(day.successRate * 100) / 100,
        averageResponseTime: day.averageResponseTime,
      })),
      modelBreakdown: Object.entries(modelBreakdown).map(([model, data]) => ({
        model,
        totalCost: Math.round(data.totalCost * 1000000) / 1000000,
        totalRequests: data.totalRequests,
        totalTokens: data.totalTokens,
        successRate: Math.round(data.successRate * 100) / 100,
        costPerRequest: data.totalRequests > 0 ? 
          Math.round((data.totalCost / data.totalRequests) * 1000000) / 1000000 : 0,
      })),
      thresholdAlert: thresholdCheck.exceeded ? {
        exceeded: true,
        dailyCost: Math.round(thresholdCheck.dailyCost * 1000000) / 1000000,
        threshold: thresholdCheck.threshold,
      } : null,
      recentLogs: includeDetails ? recentLogs.map(log => ({
        ...log,
        totalCost: Math.round(log.totalCost * 1000000) / 1000000,
        startTime: log.startTime.toISOString(),
      })) : [],
      timestamp: now.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Failed to get AI cost analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get AI cost analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, date } = body;

    if (action === 'aggregate') {
      // Trigger daily aggregation for a specific date
      const aggregationDate = date ? new Date(date) : new Date();
      aggregationDate.setHours(0, 0, 0, 0);
      
      console.log(`[API] Triggering daily aggregation for ${aggregationDate.toISOString()}`);
      
      await aggregateDailyUsage(aggregationDate);
      
      return NextResponse.json({
        success: true,
        message: 'Daily aggregation completed successfully',
        date: aggregationDate.toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'refresh') {
      // Refresh aggregation for the last 7 days
      const today = new Date();
      const promises = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        promises.push(aggregateDailyUsage(date));
      }
      
      await Promise.all(promises);
      
      return NextResponse.json({
        success: true,
        message: 'Aggregation refreshed for last 7 days',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "aggregate" or "refresh"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Failed to process AI cost analytics action:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process AI cost analytics action',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}