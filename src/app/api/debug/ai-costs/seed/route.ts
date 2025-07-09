import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../../lib/prisma';
import { randomUUID } from 'crypto';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Create a sample analysis session
    const analysisSession = await prisma.aIAnalysisSession.create({
      data: {
        sessionType: 'batch',
        triggeredBy: 'debug-seed',
        subreddit: 'entrepreneur',
        postsRequested: 5,
        postsProcessed: 5,
        opportunitiesFound: 2,
        totalCost: 0.012,
        averageCostPerPost: 0.0024,
        totalDuration: 15000,
        averageDuration: 3000,
        successRate: 100.0,
        errorCount: 0,
        startTime: new Date(now.getTime() - 15000),
        endTime: now,
      },
    });

    // Create sample usage logs
    const usageLogs = [];
    for (let i = 0; i < 5; i++) {
      const requestId = randomUUID();
      const inputTokens = 1200 + Math.floor(Math.random() * 800);
      const outputTokens = 300 + Math.floor(Math.random() * 200);
      const totalTokens = inputTokens + outputTokens;
      
      // Calculate costs using Flash pricing (cheaper)
      const inputCost = inputTokens * (0.10 / 1_000_000);
      const outputCost = outputTokens * (0.40 / 1_000_000);
      const totalCost = inputCost + outputCost;

      const log = await prisma.aIUsageLog.create({
        data: {
          sessionId: analysisSession.id,
          requestId,
          model: 'gemini-2.5-flash',
          operation: 'batch',
          startTime: new Date(now.getTime() - (5 - i) * 3000),
          endTime: new Date(now.getTime() - (5 - i) * 3000 + 2500),
          duration: 2500,
          inputTokens,
          outputTokens,
          totalTokens,
          inputCost,
          outputCost,
          totalCost,
          batchSize: 5,
          batchMode: true,
          success: true,
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          cacheHits: 0,
        },
      });

      usageLogs.push(log);
    }

    // Create sample post analyses
    const postAnalyses = [];
    for (let i = 0; i < 5; i++) {
      const postAnalysis = await prisma.aIPostAnalysis.create({
        data: {
          redditPostId: `sample_post_${i + 1}`,
          postTitle: `Sample Post ${i + 1}: Looking for feedback on my startup idea`,
          subreddit: 'entrepreneur',
          sessionId: analysisSession.id,
          analysisType: 'batch',
          model: 'gemini-2.5-flash',
          totalCost: usageLogs[i].totalCost,
          inputCost: usageLogs[i].inputCost,
          outputCost: usageLogs[i].outputCost,
          inputTokens: usageLogs[i].inputTokens,
          outputTokens: usageLogs[i].outputTokens,
          totalTokens: usageLogs[i].totalTokens,
          isOpportunity: i < 2, // First 2 are opportunities
          confidence: 0.85 + Math.random() * 0.1,
          overallScore: i < 2 ? 7.5 + Math.random() * 1.5 : 4.0 + Math.random() * 2.0,
          processingTime: 2500,
          retryCount: 0,
          success: true,
        },
      });

      postAnalyses.push(postAnalysis);
    }

    // Create daily usage aggregation for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.aIDailyUsage.upsert({
      where: { date: today },
      update: {
        totalRequests: { increment: 5 },
        successfulRequests: { increment: 5 },
        failedRequests: { increment: 0 },
        totalCost: { increment: analysisSession.totalCost },
        averageCostPerRequest: 0.0024,
        totalInputTokens: { increment: usageLogs.reduce((sum, log) => sum + log.inputTokens, 0) },
        totalOutputTokens: { increment: usageLogs.reduce((sum, log) => sum + log.outputTokens, 0) },
        totalTokens: { increment: usageLogs.reduce((sum, log) => sum + log.totalTokens, 0) },
        postsAnalyzed: { increment: 5 },
        opportunitiesFound: { increment: 2 },
        averageCostPerPost: 0.0024,
        costPerOpportunity: 0.006,
        averageResponseTime: 2500,
        successRate: 100.0,
      },
      create: {
        date: today,
        totalRequests: 5,
        successfulRequests: 5,
        failedRequests: 0,
        totalCost: analysisSession.totalCost,
        averageCostPerRequest: 0.0024,
        totalInputTokens: usageLogs.reduce((sum, log) => sum + log.inputTokens, 0),
        totalOutputTokens: usageLogs.reduce((sum, log) => sum + log.outputTokens, 0),
        totalTokens: usageLogs.reduce((sum, log) => sum + log.totalTokens, 0),
        postsAnalyzed: 5,
        opportunitiesFound: 2,
        averageCostPerPost: 0.0024,
        costPerOpportunity: 0.006,
        averageResponseTime: 2500,
        successRate: 100.0,
      },
    });

    // Create model usage for today
    await prisma.aIModelUsage.upsert({
      where: {
        model_date: {
          model: 'gemini-2.5-flash',
          date: today,
        },
      },
      update: {
        requestCount: { increment: 5 },
        successCount: { increment: 5 },
        failureCount: { increment: 0 },
        totalCost: { increment: analysisSession.totalCost },
        averageCostPerRequest: 0.0024,
        totalInputTokens: { increment: usageLogs.reduce((sum, log) => sum + log.inputTokens, 0) },
        totalOutputTokens: { increment: usageLogs.reduce((sum, log) => sum + log.outputTokens, 0) },
        totalTokens: { increment: usageLogs.reduce((sum, log) => sum + log.totalTokens, 0) },
        averageResponseTime: 2500,
        successRate: 100.0,
        individualRequests: { increment: 5 },
        batchRequests: { increment: 1 },
        fallbackRequests: { increment: 0 },
      },
      create: {
        model: 'gemini-2.5-flash',
        date: today,
        requestCount: 5,
        successCount: 5,
        failureCount: 0,
        totalCost: analysisSession.totalCost,
        averageCostPerRequest: 0.0024,
        totalInputTokens: usageLogs.reduce((sum, log) => sum + log.inputTokens, 0),
        totalOutputTokens: usageLogs.reduce((sum, log) => sum + log.outputTokens, 0),
        totalTokens: usageLogs.reduce((sum, log) => sum + log.totalTokens, 0),
        averageResponseTime: 2500,
        successRate: 100.0,
        individualRequests: 5,
        batchRequests: 1,
        fallbackRequests: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'AI cost data seeded successfully',
      data: {
        sessionId: analysisSession.id,
        usageLogsCreated: usageLogs.length,
        postAnalysesCreated: postAnalyses.length,
        totalCost: analysisSession.totalCost,
        opportunitiesFound: 2,
      },
    });
  } catch (error) {
    console.error('Error seeding AI cost data:', error);
    return NextResponse.json(
      { error: 'Failed to seed AI cost data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}