import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/shared/services/prisma';
import { inngest } from '@/shared/services/inngest';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, permalink } = await request.json();

    if (!postId || !permalink) {
      return NextResponse.json(
        { error: 'Missing postId or permalink' },
        { status: 400 }
      );
    }

    console.log(`[ANALYZE_COMMENTS] Triggering comment analysis for post ${postId}`);

    // Check if post exists and get current analysis status
    const post = await prisma.redditPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        commentAnalysisStatus: true,
        commentAnalysisJobId: true,
        commentAnalysisStarted: true,
        title: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if analysis is already in progress or completed recently
    if (post.commentAnalysisStatus === 'processing') {
      return NextResponse.json({
        success: false,
        error: 'Comment analysis already in progress',
        jobId: post.commentAnalysisJobId,
        status: post.commentAnalysisStatus,
      });
    }

    // Check if analysis was completed recently (within last 10 minutes)
    if (post.commentAnalysisStatus === 'completed' && post.commentAnalysisStarted) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      if (new Date(post.commentAnalysisStarted) > tenMinutesAgo) {
        return NextResponse.json({
          success: false,
          error: 'Comment analysis completed recently. Please wait before retrying.',
          status: post.commentAnalysisStatus,
        });
      }
    }

    // Trigger the comment analysis job
    const event = await inngest.send({
      name: 'reddit/analyze.comments',
      data: {
        postId,
        permalink,
        triggeredBy: 'manual-api',
        timestamp: new Date().toISOString(),
      },
    });

    const jobId = event.ids[0];
    console.log(`[ANALYZE_COMMENTS] Comment analysis triggered:`, jobId);

    // Update post status to track the job
    await prisma.redditPost.update({
      where: { id: postId },
      data: {
        commentAnalysisStatus: 'processing',
        commentAnalysisJobId: jobId,
        commentAnalysisStarted: new Date(),
        commentAnalysisCompleted: null,
        commentAnalysisError: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Comment analysis started',
      jobId,
      status: 'processing',
    });
  } catch (error) {
    console.error('Error triggering comment analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger comment analysis' },
      { status: 500 }
    );
  }
}