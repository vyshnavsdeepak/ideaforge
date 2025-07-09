import { NextRequest, NextResponse } from 'next/server';
import { clusteringEngine } from '@/lib/semantic-clustering';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  niche: z.string().optional(),
  trending: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      limit: searchParams.get('limit') || '20',
      niche: searchParams.get('niche') || undefined,
      trending: searchParams.get('trending') || undefined,
    });

    let clusters;

    if (params.niche) {
      // Get clusters for specific niche
      clusters = await clusteringEngine.getDemandClustersByNiche(
        params.niche,
        params.limit
      );
    } else if (params.trending) {
      // Get trending clusters from last 7 days
      clusters = await clusteringEngine.getTrendingDemandClusters();
    } else {
      // Get top clusters overall
      clusters = await clusteringEngine.getTopDemandClusters(params.limit);
    }

    // Transform data for frontend
    const transformedClusters = clusters.map(cluster => ({
      id: cluster.id,
      niche: cluster.niche,
      demandSignal: cluster.demandSignal,
      occurrenceCount: cluster.occurrenceCount,
      subreddits: cluster.subreddits,
      lastSeen: cluster.lastSeen,
      relatedOpportunities: [],
      marketStrength: calculateMarketStrength(cluster),
    }));

    return NextResponse.json({
      clusters: transformedClusters,
      totalCount: transformedClusters.length,
    });
  } catch (error) {
    console.error('Error fetching market demand clusters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market demand data' },
      { status: 500 }
    );
  }
}

function calculateMarketStrength(cluster: { occurrenceCount: number; subreddits: string[]; lastSeen: Date }): number {
  // Calculate market strength based on multiple factors
  const factors = {
    occurrenceCount: Math.min(cluster.occurrenceCount / 50, 1) * 0.4,
    subredditDiversity: Math.min(cluster.subreddits.length / 5, 1) * 0.3,
    recency: calculateRecencyScore(cluster.lastSeen) * 0.3,
  };

  const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
  return Math.round(totalScore * 100);
}

function calculateRecencyScore(lastSeen: Date): number {
  const daysSince = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 1) return 1;
  if (daysSince < 7) return 0.8;
  if (daysSince < 30) return 0.5;
  return 0.2;
}