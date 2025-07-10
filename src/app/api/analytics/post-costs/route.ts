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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const subreddit = searchParams.get('subreddit');
    const model = searchParams.get('model');
    const analysisType = searchParams.get('analysisType'); // individual, batch, fallback
    const isOpportunity = searchParams.get('isOpportunity');
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, totalCost, processingTime
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc, desc
    const includePostData = searchParams.get('includePostData') === 'true';

    // Build where clause
    const whereClause: {
      subreddit?: string;
      model?: string;
      analysisType?: string;
      isOpportunity?: boolean;
    } = {};
    if (subreddit) {
      whereClause.subreddit = subreddit;
    }
    if (model) {
      whereClause.model = model;
    }
    if (analysisType) {
      whereClause.analysisType = analysisType;
    }
    if (isOpportunity !== null) {
      whereClause.isOpportunity = isOpportunity === 'true';
    }

    // Build order by clause
    const orderByClause: Record<string, string> = {};
    orderByClause[sortBy] = sortOrder;

    // Get post analyses with costs
    const postAnalyses = await prisma.aIPostAnalysis.findMany({
      where: whereClause,
      orderBy: orderByClause,
      take: limit,
      skip: offset,
      include: {
        redditPost: includePostData ? {
          select: {
            id: true,
            title: true,
            content: true,
            author: true,
            score: true,
            numComments: true,
            createdUtc: true,
            subreddit: true,
          },
        } : false,
        opportunity: includePostData ? {
          select: {
            id: true,
            title: true,
            description: true,
            overallScore: true,
            viabilityThreshold: true,
            businessType: true,
            industryVertical: true,
            niche: true,
          },
        } : false,
        session: {
          select: {
            id: true,
            sessionType: true,
            triggeredBy: true,
            startTime: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.aIPostAnalysis.count({
      where: whereClause,
    });

    // Calculate summary statistics
    const totalCost = postAnalyses.reduce((sum, analysis) => sum + analysis.totalCost, 0);
    const totalTokens = postAnalyses.reduce((sum, analysis) => sum + analysis.totalTokens, 0);
    const opportunitiesFound = postAnalyses.filter(analysis => analysis.isOpportunity).length;
    const successfulAnalyses = postAnalyses.filter(analysis => analysis.success).length;
    const averageProcessingTime = postAnalyses.length > 0 ? 
      postAnalyses.reduce((sum, analysis) => sum + (analysis.processingTime || 0), 0) / postAnalyses.length : 0;

    // Calculate cost distribution
    const costRanges = {
      veryLow: 0,    // < $0.001
      low: 0,        // $0.001 - $0.01
      medium: 0,     // $0.01 - $0.1
      high: 0,       // $0.1 - $1
      veryHigh: 0,   // > $1
    };

    postAnalyses.forEach(analysis => {
      const cost = analysis.totalCost;
      if (cost < 0.001) {
        costRanges.veryLow++;
      } else if (cost < 0.01) {
        costRanges.low++;
      } else if (cost < 0.1) {
        costRanges.medium++;
      } else if (cost < 1) {
        costRanges.high++;
      } else {
        costRanges.veryHigh++;
      }
    });

    // Group by subreddit for subreddit analysis
    const subredditStats = postAnalyses.reduce((acc, analysis) => {
      const subreddit = analysis.subreddit;
      if (!acc[subreddit]) {
        acc[subreddit] = {
          count: 0,
          totalCost: 0,
          opportunities: 0,
          successRate: 0,
          averageProcessingTime: 0,
          averageCostPerPost: 0,
          opportunityRate: 0,
        };
      }
      acc[subreddit].count++;
      acc[subreddit].totalCost += analysis.totalCost;
      if (analysis.isOpportunity) acc[subreddit].opportunities++;
      if (analysis.success) acc[subreddit].successRate++;
      acc[subreddit].averageProcessingTime += analysis.processingTime || 0;
      return acc;
    }, {} as Record<string, {
      count: number;
      totalCost: number;
      opportunities: number;
      successRate: number;
      averageProcessingTime: number;
      averageCostPerPost: number;
      opportunityRate: number;
    }>);

    // Calculate averages for subreddit stats
    Object.keys(subredditStats).forEach(subreddit => {
      const stats = subredditStats[subreddit];
      stats.averageCostPerPost = stats.totalCost / stats.count;
      stats.successRate = (stats.successRate / stats.count) * 100;
      stats.averageProcessingTime = stats.averageProcessingTime / stats.count;
      stats.opportunityRate = (stats.opportunities / stats.count) * 100;
    });

    // Format response
    const formattedAnalyses = postAnalyses.map(analysis => ({
      id: analysis.id,
      postTitle: analysis.postTitle,
      subreddit: analysis.subreddit,
      model: analysis.model,
      analysisType: analysis.analysisType,
      totalCost: Math.round(analysis.totalCost * 1000000) / 1000000,
      inputCost: Math.round(analysis.inputCost * 1000000) / 1000000,
      outputCost: Math.round(analysis.outputCost * 1000000) / 1000000,
      inputTokens: analysis.inputTokens,
      outputTokens: analysis.outputTokens,
      totalTokens: analysis.totalTokens,
      costPerToken: analysis.totalTokens > 0 ? 
        Math.round((analysis.totalCost / analysis.totalTokens) * 1000000) / 1000000 : 0,
      isOpportunity: analysis.isOpportunity,
      confidence: analysis.confidence,
      overallScore: analysis.overallScore,
      processingTime: analysis.processingTime,
      retryCount: analysis.retryCount,
      success: analysis.success,
      errorMessage: analysis.errorMessage,
      createdAt: analysis.createdAt.toISOString(),
      session: analysis.session ? {
        id: analysis.session.id,
        sessionType: analysis.session.sessionType,
        triggeredBy: analysis.session.triggeredBy,
        startTime: analysis.session.startTime.toISOString(),
      } : null,
      ...(includePostData && {
        redditPost: analysis.redditPost ? {
          id: analysis.redditPost.id,
          title: analysis.redditPost.title,
          content: analysis.redditPost.content?.substring(0, 200) + '...',
          author: analysis.redditPost.author,
          score: analysis.redditPost.score,
          numComments: analysis.redditPost.numComments,
          createdUtc: analysis.redditPost.createdUtc.toISOString(),
          subreddit: analysis.redditPost.subreddit,
        } : null,
        opportunity: analysis.opportunity ? {
          id: analysis.opportunity.id,
          title: analysis.opportunity.title,
          description: analysis.opportunity.description?.substring(0, 200) + '...',
          overallScore: analysis.opportunity.overallScore,
          viabilityThreshold: analysis.opportunity.viabilityThreshold,
          businessType: analysis.opportunity.businessType,
          industryVertical: analysis.opportunity.industryVertical,
          niche: analysis.opportunity.niche,
        } : null,
      }),
    }));

    const response = {
      postAnalyses: formattedAnalyses,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      summary: {
        totalAnalyses: postAnalyses.length,
        totalCost: Math.round(totalCost * 1000000) / 1000000,
        totalTokens,
        opportunitiesFound,
        successfulAnalyses,
        successRate: postAnalyses.length > 0 ? 
          Math.round((successfulAnalyses / postAnalyses.length) * 100 * 100) / 100 : 0,
        opportunityRate: postAnalyses.length > 0 ? 
          Math.round((opportunitiesFound / postAnalyses.length) * 100 * 100) / 100 : 0,
        averageCostPerPost: postAnalyses.length > 0 ? 
          Math.round((totalCost / postAnalyses.length) * 1000000) / 1000000 : 0,
        averageCostPerToken: totalTokens > 0 ? 
          Math.round((totalCost / totalTokens) * 1000000) / 1000000 : 0,
        averageProcessingTime: Math.round(averageProcessingTime),
        costPerOpportunity: opportunitiesFound > 0 ? 
          Math.round((totalCost / opportunitiesFound) * 1000000) / 1000000 : 0,
      },
      analytics: {
        costDistribution: costRanges,
        subredditStats: Object.entries(subredditStats).map(([subreddit, stats]) => ({
          subreddit,
          count: stats.count,
          totalCost: Math.round(stats.totalCost * 1000000) / 1000000,
          averageCostPerPost: Math.round(stats.averageCostPerPost * 1000000) / 1000000,
          opportunities: stats.opportunities,
          opportunityRate: Math.round(stats.opportunityRate * 100) / 100,
          successRate: Math.round(stats.successRate * 100) / 100,
          averageProcessingTime: Math.round(stats.averageProcessingTime),
        })).sort((a, b) => b.totalCost - a.totalCost),
      },
      filters: {
        subreddit,
        model,
        analysisType,
        isOpportunity,
        sortBy,
        sortOrder,
        includePostData,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Failed to get post cost analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get post cost analytics',
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
    const postAnalysisId = searchParams.get('postAnalysisId');
    const olderThan = searchParams.get('olderThan'); // ISO date string
    const subreddit = searchParams.get('subreddit');

    if (postAnalysisId) {
      // Delete specific post analysis
      await prisma.aIPostAnalysis.delete({
        where: { id: postAnalysisId },
      });

      return NextResponse.json({
        success: true,
        message: `Post analysis ${postAnalysisId} deleted successfully`,
        timestamp: new Date().toISOString(),
      });
    }

    if (olderThan) {
      // Delete post analyses older than specified date
      const deleteDate = new Date(olderThan);
      const whereClause: {
        createdAt: { lt: Date };
        subreddit?: string;
      } = {
        createdAt: {
          lt: deleteDate,
        },
      };

      if (subreddit) {
        whereClause.subreddit = subreddit;
      }

      const deletedAnalyses = await prisma.aIPostAnalysis.deleteMany({
        where: whereClause,
      });

      return NextResponse.json({
        success: true,
        message: `${deletedAnalyses.count} post analyses deleted`,
        deletedCount: deletedAnalyses.count,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Either postAnalysisId or olderThan parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Failed to delete post analyses:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete post analyses',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}