import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const niche = searchParams.get('niche');
    const sortBy = searchParams.get('sortBy') || 'occurrences';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { demandSignal: { contains: search, mode: 'insensitive' } },
        { niche: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (niche) {
      where.niche = niche;
    }

    // Build orderBy clause
    let orderBy: Record<string, string> = {};
    switch (sortBy) {
      case 'occurrences':
        orderBy = { occurrenceCount: 'desc' };
        break;
      case 'recent':
        orderBy = { lastSeen: 'desc' };
        break;
      case 'opportunities':
        // This will be handled differently
        orderBy = { occurrenceCount: 'desc' };
        break;
      default:
        orderBy = { occurrenceCount: 'desc' };
    }

    // Fetch clusters with related opportunities
    const clusters = await prisma.marketDemandCluster.findMany({
      where,
      include: {
        opportunities: {
          select: {
            id: true,
            opportunity: {
              select: {
                id: true,
                title: true,
                overallScore: true,
                viabilityThreshold: true,
              },
            },
          },
        },
      },
      orderBy,
    });

    // If sorting by opportunities, sort manually
    if (sortBy === 'opportunities') {
      clusters.sort((a, b) => b.opportunities.length - a.opportunities.length);
    }

    // Get statistics
    const [totalClusters, totalSignals] = await Promise.all([
      prisma.marketDemandCluster.count(),
      prisma.marketDemandCluster.aggregate({
        _sum: {
          occurrenceCount: true,
        },
      }),
    ]);

    // Get active niches
    const activeNiches = await prisma.marketDemandCluster.groupBy({
      by: ['niche'],
      _count: {
        niche: true,
      },
      _sum: {
        occurrenceCount: true,
      },
      orderBy: {
        _sum: {
          occurrenceCount: 'desc',
        },
      },
    });

    // Get top subreddits
    const allSubreddits: Record<string, number> = {};
    clusters.forEach(cluster => {
      cluster.subreddits.forEach(sub => {
        allSubreddits[sub] = (allSubreddits[sub] || 0) + cluster.occurrenceCount;
      });
    });
    const topSubreddits = Object.entries(allSubreddits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Calculate growing demands
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentClusters = await prisma.marketDemandCluster.findMany({
      where: {
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        occurrenceCount: 'desc',
      },
      take: 10,
    });

    // Simple growth calculation (you might want to make this more sophisticated)
    const growingDemands = recentClusters
      .map(cluster => {
        // Calculate a simple growth rate based on recency and occurrence count
        const daysSinceUpdate = Math.floor((Date.now() - new Date(cluster.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const growthRate = daysSinceUpdate > 0 ? Math.round((cluster.occurrenceCount / daysSinceUpdate) * 100) : 100;
        
        return {
          niche: cluster.niche,
          growthRate,
          currentCount: cluster.occurrenceCount,
        };
      })
      .filter(d => d.growthRate > 0)
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, 6);

    // Get emerging niches (niches created in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const emergingNiches = await prisma.marketDemandCluster.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        niche: true,
      },
      distinct: ['niche'],
      take: 5,
    });

    return NextResponse.json({
      success: true,
      data: {
        clusters,
        stats: {
          totalClusters,
          totalSignals: totalSignals._sum.occurrenceCount || 0,
          activeNiches: activeNiches.length,
          topSubreddits,
        },
        trends: {
          growingDemands,
          emergingNiches: emergingNiches.map(e => e.niche),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching market intelligence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market intelligence' },
      { status: 500 }
    );
  }
}