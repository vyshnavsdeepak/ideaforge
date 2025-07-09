import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { inngest } from '../../../../lib/inngest';
import { prisma } from '../../../../lib/prisma';

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

    // Group posts by subreddit for better analysis context
    const postsBySubreddit = unprocessedPosts.reduce((groups, post) => {
      if (!groups[post.subreddit]) {
        groups[post.subreddit] = [];
      }
      groups[post.subreddit].push(post);
      return groups;
    }, {} as Record<string, typeof unprocessedPosts>);

    // Process each subreddit's posts
    const batchResults = [];
    
    for (const [subreddit, posts] of Object.entries(postsBySubreddit)) {
      console.log(`[MANUAL_BATCH_AI] Processing ${posts.length} posts from r/${subreddit}`);
      
      try {
        // Send batch analysis event
        const batchEvent = await inngest.send({
          name: "ai/batch-analyze.opportunities",
          data: {
            subreddit,
            posts: posts.map(post => ({
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
              totalPosts: posts.length,
              subreddit,
              timestamp: new Date().toISOString(),
            }
          }
        });
        
        batchResults.push({
          subreddit,
          postsQueued: posts.length,
          eventId: batchEvent.ids[0],
          success: true,
        });
        
        console.log(`[MANUAL_BATCH_AI] Queued ${posts.length} posts from r/${subreddit} for analysis`);
      } catch (error) {
        console.error(`[MANUAL_BATCH_AI] Failed to queue posts from r/${subreddit}:`, error);
        batchResults.push({
          subreddit,
          postsQueued: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    const totalProcessed = batchResults.reduce((sum, result) => sum + (result.postsQueued || 0), 0);
    const successfulBatches = batchResults.filter(r => r.success).length;

    console.log(`[MANUAL_BATCH_AI] Completed: ${totalProcessed} posts queued across ${successfulBatches} subreddits`);

    return NextResponse.json({
      success: true,
      message: `Queued ${totalProcessed} posts for batch AI analysis`,
      postsQueued: totalProcessed,
      subredditsProcessed: successfulBatches,
      totalSubreddits: Object.keys(postsBySubreddit).length,
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