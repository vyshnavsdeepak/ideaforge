import { NextRequest, NextResponse } from 'next/server';
import { opportunityClusteringEngine } from '@/lib/opportunity-clustering';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  minSources: z.coerce.number().min(1).max(10).optional().default(2),
  forceRecalculate: z.coerce.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      limit: searchParams.get('limit') || '20',
      minSources: searchParams.get('minSources') || '2',
      forceRecalculate: searchParams.get('forceRecalculate') || 'false',
    });

    // Get clustered opportunities
    const result = await opportunityClusteringEngine.getTopRequestedIdeas(params.limit);
    
    // Filter by minimum sources
    const filteredClusters = result.clusters.filter(cluster => 
      cluster.sourceCount >= params.minSources
    );

    // Transform data for frontend
    const transformedClusters = filteredClusters.map(cluster => ({
      id: cluster.id,
      title: cluster.title,
      description: cluster.description,
      sourceCount: cluster.sourceCount,
      opportunityCount: cluster.opportunities.length,
      avgScore: Math.round(cluster.avgScore * 10) / 10,
      viabilityRate: Math.round((cluster.totalViability / cluster.opportunities.length) * 100),
      subreddits: cluster.subreddits,
      trendingScore: Math.round(cluster.trendingScore),
      firstSeen: cluster.firstSeen,
      lastSeen: cluster.lastSeen,
      opportunities: cluster.opportunities.map(opp => ({
        id: opp.id,
        title: opp.title,
        description: opp.description.slice(0, 200) + '...',
        overallScore: opp.overallScore,
        viabilityThreshold: opp.viabilityThreshold,
        subreddit: opp.subreddit,
        sourceCount: opp.sourceCount,
        createdAt: opp.createdAt,
        redditPostCount: opp.redditPosts.length,
      })),
      topRedditPosts: cluster.opportunities
        .flatMap(opp => opp.redditPosts)
        .sort((a, b) => b.redditPost.score - a.redditPost.score)
        .slice(0, 5)
        .map(post => ({
          id: post.redditPost.id,
          title: post.redditPost.title,
          author: post.redditPost.author,
          score: post.redditPost.score,
          subreddit: post.redditPost.subreddit,
          createdUtc: post.redditPost.createdUtc,
        })),
    }));

    return NextResponse.json({
      clusters: transformedClusters,
      summary: {
        ...result.summary,
        filteredClusters: filteredClusters.length,
        totalSources: filteredClusters.reduce((sum, cluster) => sum + cluster.sourceCount, 0),
        avgTrendingScore: filteredClusters.reduce((sum, cluster) => sum + cluster.trendingScore, 0) / filteredClusters.length,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        totalClustersAnalyzed: result.clusters.length,
        minSourcesFilter: params.minSources,
        limitApplied: params.limit,
      },
    });
  } catch (error) {
    console.error('Error fetching opportunity clusters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunity clusters' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Force recalculate clusters
    const clusters = await opportunityClusteringEngine.clusterSimilarOpportunities();
    
    return NextResponse.json({
      success: true,
      message: 'Opportunity clusters recalculated successfully',
      clustersGenerated: clusters.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error recalculating opportunity clusters:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate opportunity clusters' },
      { status: 500 }
    );
  }
}