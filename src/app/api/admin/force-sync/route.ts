import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';

export async function POST() {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[FORCE_SYNC] Starting data synchronization');
    
    const syncResults = {
      synced: [] as string[],
      errors: [] as string[],
      stats: {
        before: {} as Record<string, number>,
        after: {} as Record<string, number>,
      },
    };

    // Get initial stats
    try {
      const [totalPosts, processedPosts, totalOpportunities, totalSources] = await Promise.all([
        prisma.redditPost.count(),
        prisma.redditPost.count({ where: { processedAt: { not: null } } }),
        prisma.opportunity.count(),
        prisma.opportunitySource.count(),
      ]);
      
      syncResults.stats.before = {
        totalPosts,
        processedPosts,
        totalOpportunities,
        totalSources,
      };
    } catch (error) {
      syncResults.errors.push('Initial stats: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // 1. Sync opportunity sources - ensure all opportunities have proper sources
    try {
      const opportunitiesWithoutSources = await prisma.opportunity.findMany({
        where: {
          redditPosts: {
            none: {},
          },
        },
        include: {
          redditPosts: true,
        },
      });

      if (opportunitiesWithoutSources.length > 0) {
        // These opportunities might be orphaned - we'll need to either link them or remove them
        // For now, just count them
        syncResults.synced.push(`Found ${opportunitiesWithoutSources.length} opportunities without sources`);
      } else {
        syncResults.synced.push('All opportunities have proper sources');
      }
    } catch (error) {
      syncResults.errors.push('Opportunity sources sync: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // 2. Sync Reddit post processing status
    try {
      const unprocessedPosts = await prisma.redditPost.findMany({
        where: {
          processedAt: null,
          processingError: null,
        },
        include: {
          opportunitySources: true,
        },
      });

      let updatedPosts = 0;
      for (const post of unprocessedPosts) {
        if (post.opportunitySources.length > 0) {
          // This post has opportunities, so it should be marked as processed
          await prisma.redditPost.update({
            where: { id: post.id },
            data: { processedAt: new Date() },
          });
          updatedPosts++;
        }
      }

      if (updatedPosts > 0) {
        syncResults.synced.push(`Updated processing status for ${updatedPosts} posts`);
      } else {
        syncResults.synced.push('All posts have correct processing status');
      }
    } catch (error) {
      syncResults.errors.push('Post processing status sync: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // 3. Sync opportunity scores and viability
    try {
      const opportunities = await prisma.opportunity.findMany({
        select: {
          id: true,
          speedScore: true,
          convenienceScore: true,
          trustScore: true,
          priceScore: true,
          statusScore: true,
          predictabilityScore: true,
          uiUxScore: true,
          easeOfUseScore: true,
          legalFrictionScore: true,
          emotionalComfortScore: true,
          overallScore: true,
          viabilityThreshold: true,
        },
      });

      let updatedScores = 0;
      for (const opportunity of opportunities) {
        // Calculate overall score
        const scores = {
          speed: opportunity.speedScore,
          convenience: opportunity.convenienceScore,
          trust: opportunity.trustScore,
          price: opportunity.priceScore,
          status: opportunity.statusScore,
          predictability: opportunity.predictabilityScore,
          uiUx: opportunity.uiUxScore,
          easeOfUse: opportunity.easeOfUseScore,
          legalFriction: opportunity.legalFrictionScore,
          emotionalComfort: opportunity.emotionalComfortScore,
        };

        const weights = {
          speed: 0.15,
          convenience: 0.15,
          trust: 0.12,
          price: 0.1,
          status: 0.08,
          predictability: 0.1,
          uiUx: 0.1,
          easeOfUse: 0.1,
          legalFriction: 0.05,
          emotionalComfort: 0.05,
        };

        let weightedSum = 0;
        Object.entries(weights).forEach(([key, weight]) => {
          weightedSum += (scores[key as keyof typeof scores] || 0) * weight;
        });

        const calculatedScore = Math.round(weightedSum * 100) / 100;
        const calculatedViability = calculatedScore >= 4.0;

        // Update if there's a discrepancy
        if (
          Math.abs(opportunity.overallScore - calculatedScore) > 0.01 ||
          opportunity.viabilityThreshold !== calculatedViability
        ) {
          await prisma.opportunity.update({
            where: { id: opportunity.id },
            data: {
              overallScore: calculatedScore,
              viabilityThreshold: calculatedViability,
            },
          });
          updatedScores++;
        }
      }

      if (updatedScores > 0) {
        syncResults.synced.push(`Updated scores for ${updatedScores} opportunities`);
      } else {
        syncResults.synced.push('All opportunity scores are synchronized');
      }
    } catch (error) {
      syncResults.errors.push('Opportunity scores sync: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Get final stats
    try {
      const [totalPosts, processedPosts, totalOpportunities, totalSources] = await Promise.all([
        prisma.redditPost.count(),
        prisma.redditPost.count({ where: { processedAt: { not: null } } }),
        prisma.opportunity.count(),
        prisma.opportunitySource.count(),
      ]);
      
      syncResults.stats.after = {
        totalPosts,
        processedPosts,
        totalOpportunities,
        totalSources,
      };
    } catch (error) {
      syncResults.errors.push('Final stats: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    console.log('[FORCE_SYNC] Data synchronization completed');
    
    return NextResponse.json({
      success: true,
      message: 'Data synchronization completed',
      data: {
        synced: syncResults.synced,
        errors: syncResults.errors,
        stats: syncResults.stats,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('[FORCE_SYNC] Data synchronization failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Data synchronization failed',
      },
      { status: 500 }
    );
  }
}