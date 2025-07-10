import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma, inngest } from '@/shared';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[REPROCESS_FAILED] Finding posts with processing errors');

    // Find posts with processing errors
    const failedPosts = await prisma.redditPost.findMany({
      where: {
        processedAt: null,
        processingError: { not: null },
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100, // Process up to 100 failed posts
    });

    if (failedPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed posts found to reprocess',
        postsReprocessed: 0,
      });
    }

    console.log(`[REPROCESS_FAILED] Found ${failedPosts.length} failed posts to reprocess`);

    // Clear processing errors to allow reprocessing
    await prisma.redditPost.updateMany({
      where: {
        id: { in: failedPosts.map(p => p.id) },
      },
      data: {
        processingError: null,
        updatedAt: new Date(),
      },
    });

    // Process posts in efficient batches regardless of subreddit
    const batchSize = 25; // Process 25 posts per batch
    const batchResults = [];
    
    for (let i = 0; i < failedPosts.length; i += batchSize) {
      const batch = failedPosts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
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
            triggeredBy: "reprocess-failed-posts",
            batchInfo: {
              batchNumber,
              totalBatches: Math.ceil(failedPosts.length / batchSize),
              postsInBatch: batch.length,
              totalPosts: failedPosts.length,
              isRetry: true,
              isMixedSubreddits: true,
              timestamp: new Date().toISOString(),
            }
          }
        });
        
        batchResults.push({
          batchNumber,
          postsReprocessed: batch.length,
          eventId: batchEvent.ids[0],
          success: true,
        });
        
        console.log(`[REPROCESS_FAILED] Triggered batch ${batchNumber} with ${batch.length} posts`);
        
      } catch (error) {
        console.error(`[REPROCESS_FAILED] Failed to reprocess batch ${batchNumber}:`, error);
        batchResults.push({
          batchNumber,
          postsReprocessed: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    const totalReprocessed = batchResults.reduce((sum, result) => sum + (result.postsReprocessed || 0), 0);
    const successfulBatches = batchResults.filter(r => r.success).length;

    console.log(`[REPROCESS_FAILED] Reprocessed ${totalReprocessed} posts in ${successfulBatches} batches`);

    return NextResponse.json({
      success: true,
      message: `Reprocessing ${totalReprocessed} failed posts in ${batchResults.length} batches`,
      postsReprocessed: totalReprocessed,
      batchesTriggered: batchResults.length,
      successfulBatches,
      results: batchResults,
    });
  } catch (error) {
    console.error('[REPROCESS_FAILED] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reprocess failed posts',
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

    // Get count of failed posts by subreddit
    const failedStats = await prisma.redditPost.groupBy({
      by: ['subreddit'],
      where: {
        processedAt: null,
        processingError: { not: null },
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

    const totalFailed = failedStats.reduce((sum, stat) => sum + stat._count.id, 0);

    return NextResponse.json({
      totalFailed,
      subredditBreakdown: failedStats.map(stat => ({
        subreddit: stat.subreddit,
        count: stat._count.id,
      })),
    });
  } catch (error) {
    console.error('[REPROCESS_FAILED] Error fetching failed posts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch failed posts info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}