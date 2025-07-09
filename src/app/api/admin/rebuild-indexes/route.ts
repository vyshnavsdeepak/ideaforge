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

    console.log('[REBUILD_INDEXES] Starting database index rebuild');
    
    const rebuildResults = {
      rebuilt: [] as string[],
      errors: [] as string[],
      stats: {
        before: {} as Record<string, number>,
        after: {} as Record<string, number>,
      },
    };

    // Get initial query performance stats
    try {
      const start = Date.now();
      await prisma.redditPost.count();
      const postsQueryTime = Date.now() - start;
      
      const start2 = Date.now();
      await prisma.opportunity.count();
      const opportunitiesQueryTime = Date.now() - start2;
      
      rebuildResults.stats.before = {
        postsQueryTime,
        opportunitiesQueryTime,
      };
    } catch (error) {
      rebuildResults.errors.push('Initial stats: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Run ANALYZE on key tables to update statistics
    try {
      await prisma.$executeRaw`ANALYZE "RedditPost"`;
      rebuildResults.rebuilt.push('Analyzed RedditPost table statistics');
    } catch (error) {
      rebuildResults.errors.push('RedditPost analyze: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`ANALYZE "Opportunity"`;
      rebuildResults.rebuilt.push('Analyzed Opportunity table statistics');
    } catch (error) {
      rebuildResults.errors.push('Opportunity analyze: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`ANALYZE "OpportunitySource"`;
      rebuildResults.rebuilt.push('Analyzed OpportunitySource table statistics');
    } catch (error) {
      rebuildResults.errors.push('OpportunitySource analyze: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Rebuild/reindex key indexes (PostgreSQL specific)
    try {
      await prisma.$executeRaw`REINDEX INDEX "RedditPost_subreddit_idx"`;
      rebuildResults.rebuilt.push('Rebuilt subreddit index');
    } catch (error) {
      rebuildResults.errors.push('Subreddit index: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`REINDEX INDEX "RedditPost_processedAt_idx"`;
      rebuildResults.rebuilt.push('Rebuilt processedAt index');
    } catch (error) {
      rebuildResults.errors.push('ProcessedAt index: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`REINDEX INDEX "RedditPost_createdUtc_idx"`;
      rebuildResults.rebuilt.push('Rebuilt createdUtc index');
    } catch (error) {
      rebuildResults.errors.push('CreatedUtc index: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`REINDEX INDEX "RedditPost_title_idx"`;
      rebuildResults.rebuilt.push('Rebuilt title index');
    } catch (error) {
      rebuildResults.errors.push('Title index: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`REINDEX INDEX "RedditPost_author_idx"`;
      rebuildResults.rebuilt.push('Rebuilt author index');
    } catch (error) {
      rebuildResults.errors.push('Author index: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`REINDEX INDEX "RedditPost_title_author_idx"`;
      rebuildResults.rebuilt.push('Rebuilt title+author composite index');
    } catch (error) {
      rebuildResults.errors.push('Title+author index: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Vacuum the tables to reclaim space and update statistics
    try {
      await prisma.$executeRaw`VACUUM ANALYZE "RedditPost"`;
      rebuildResults.rebuilt.push('Vacuumed RedditPost table');
    } catch (error) {
      rebuildResults.errors.push('RedditPost vacuum: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`VACUUM ANALYZE "Opportunity"`;
      rebuildResults.rebuilt.push('Vacuumed Opportunity table');
    } catch (error) {
      rebuildResults.errors.push('Opportunity vacuum: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    try {
      await prisma.$executeRaw`VACUUM ANALYZE "OpportunitySource"`;
      rebuildResults.rebuilt.push('Vacuumed OpportunitySource table');
    } catch (error) {
      rebuildResults.errors.push('OpportunitySource vacuum: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Get final query performance stats
    try {
      const start = Date.now();
      await prisma.redditPost.count();
      const postsQueryTime = Date.now() - start;
      
      const start2 = Date.now();
      await prisma.opportunity.count();
      const opportunitiesQueryTime = Date.now() - start2;
      
      rebuildResults.stats.after = {
        postsQueryTime,
        opportunitiesQueryTime,
      };
    } catch (error) {
      rebuildResults.errors.push('Final stats: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    console.log('[REBUILD_INDEXES] Database index rebuild completed');
    
    return NextResponse.json({
      success: true,
      message: 'Database indexes rebuilt successfully',
      data: {
        rebuilt: rebuildResults.rebuilt,
        errors: rebuildResults.errors,
        stats: rebuildResults.stats,
        timestamp: new Date().toISOString(),
        note: 'Database performance may be temporarily impacted during rebuild.',
      },
    });
    
  } catch (error) {
    console.error('[REBUILD_INDEXES] Database index rebuild failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database index rebuild failed',
      },
      { status: 500 }
    );
  }
}