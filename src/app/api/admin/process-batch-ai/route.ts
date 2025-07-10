import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/shared/services/prisma';
import { inngest } from '@/shared/services/inngest';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[MANUAL_BATCH_AI] Manual batch AI processing triggered');

    // Get count of unprocessed posts
    const unprocessedCount = await prisma.redditPost.count({
      where: {
        processedAt: null,
        processingError: null,
      },
    });

    if (unprocessedCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unprocessed posts found',
        postsQueued: 0,
      });
    }

    // Find all unprocessed posts
    const unprocessedPosts = await prisma.redditPost.findMany({
      where: {
        processedAt: null,
        processingError: null,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 200, // Process up to 200 posts at a time
    });

    // Process posts in efficient batches regardless of subreddit
    const batchSize = 25; // Process 25 posts per batch
    const batchResults = [];
    
    for (let i = 0; i < unprocessedPosts.length; i += batchSize) {
      const batch = unprocessedPosts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`[MANUAL_BATCH_AI] Processing batch ${batchNumber} with ${batch.length} posts`);
      
      try {
        // Send batch analysis event
        const batchEvent = await inngest.send({
          name: "ai/batch-analyze.opportunities",
          data: {
            subreddit: "mixed", // Indicate this is a mixed batch
            posts: batch.map(post => ({
              postId: post.id,
              postTitle: post.title,
              postContent: post.content || '',
              subreddit: post.subreddit,
              author: post.author,
              score: post.score,
              numComments: post.numComments,
            })),
            triggeredBy: "manual-admin-trigger",
            batchInfo: {
              batchNumber,
              totalBatches: Math.ceil(unprocessedPosts.length / batchSize),
              postsInBatch: batch.length,
              totalPosts: unprocessedPosts.length,
              isMixedSubreddits: true,
              timestamp: new Date().toISOString(),
            }
          }
        });
        
        batchResults.push({
          batchNumber,
          postsQueued: batch.length,
          eventId: batchEvent.ids[0],
          success: true,
        });
        
        console.log(`[MANUAL_BATCH_AI] Queued batch ${batchNumber} with ${batch.length} posts for analysis`);
      } catch (error) {
        console.error(`[MANUAL_BATCH_AI] Failed to queue batch ${batchNumber}:`, error);
        batchResults.push({
          batchNumber,
          postsQueued: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    const totalProcessed = batchResults.reduce((sum, result) => sum + (result.postsQueued || 0), 0);
    const successfulBatches = batchResults.filter(r => r.success).length;

    console.log(`[MANUAL_BATCH_AI] Completed: ${totalProcessed} posts queued in ${successfulBatches} batches`);

    return NextResponse.json({
      success: true,
      message: `Queued ${totalProcessed} posts for batch AI analysis in ${batchResults.length} batches`,
      postsQueued: totalProcessed,
      batchesTriggered: batchResults.length,
      successfulBatches,
      results: batchResults,
    });
  } catch (error) {
    console.error('[MANUAL_BATCH_AI] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger batch AI processing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get count of unprocessed posts by subreddit
    const unprocessedStats = await prisma.redditPost.groupBy({
      by: ['subreddit'],
      where: {
        processedAt: null,
        processingError: null,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    const totalUnprocessed = unprocessedStats.reduce((sum, stat) => sum + stat._count.id, 0);

    return NextResponse.json({
      totalUnprocessed,
      subredditBreakdown: unprocessedStats.map(stat => ({
        subreddit: stat.subreddit,
        count: stat._count.id,
      })),
    });
  } catch (error) {
    console.error('[MANUAL_BATCH_AI] Error fetching status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch batch AI status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}