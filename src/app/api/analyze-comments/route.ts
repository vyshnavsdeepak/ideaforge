import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { inngest } from '../../../lib/inngest';

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

    console.log(`[ANALYZE_COMMENTS] Comment analysis triggered:`, event.ids[0]);

    return NextResponse.json({
      success: true,
      message: 'Comment analysis triggered',
      jobId: event.ids[0],
    });
  } catch (error) {
    console.error('Error triggering comment analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger comment analysis' },
      { status: 500 }
    );
  }
}