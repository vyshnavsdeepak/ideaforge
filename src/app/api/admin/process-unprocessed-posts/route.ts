import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { inngest } from '@/shared';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { limit = 500 } = body;

    console.log(`[API] Processing unprocessed posts triggered by ${session.user?.email}`);
    console.log(`[API] Limit: ${limit} posts`);

    // Trigger the unprocessed posts processing job
    const event = await inngest.send({
      name: "ai/process-unprocessed-posts",
      data: {
        limit,
        triggeredBy: "manual-api",
        userEmail: session.user?.email,
        timestamp: new Date().toISOString(),
      }
    });

    const response = {
      success: true,
      message: `Unprocessed posts processing job triggered successfully`,
      eventId: event.ids[0],
      limit,
      triggeredBy: session.user?.email,
      timestamp: new Date().toISOString(),
    };

    console.log(`[API] Unprocessed posts processing job triggered:`, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Failed to trigger unprocessed posts processing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger unprocessed posts processing',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
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

    // Get count of unprocessed posts
    const { prisma } = await import('@/shared');
    
    const unprocessedCount = await prisma.redditPost.count({
      where: {
        processedAt: null,
        processingError: null,
      }
    });

    const unprocessedBySubreddit = await prisma.redditPost.groupBy({
      by: ['subreddit'],
      where: {
        processedAt: null,
        processingError: null,
      },
      _count: {
        subreddit: true,
      },
      orderBy: {
        _count: {
          subreddit: 'desc',
        },
      },
    });

    const erroredCount = await prisma.redditPost.count({
      where: {
        processedAt: null,
        processingError: { not: null },
      }
    });

    const response = {
      unprocessedCount,
      erroredCount,
      unprocessedBySubreddit: unprocessedBySubreddit.map(group => ({
        subreddit: group.subreddit,
        count: group._count.subreddit,
      })),
      totalSubreddits: unprocessedBySubreddit.length,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Failed to get unprocessed posts info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get unprocessed posts info',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}