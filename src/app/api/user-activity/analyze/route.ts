import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { inngest } from '@/shared';
import { prisma } from '@/shared';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, analysisType = 'comments', limit } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username' },
        { status: 400 }
      );
    }

    // Clean username (remove u/ prefix if present)
    const cleanUsername = username.replace(/^u\//, '');

    console.log(`[USER_ANALYSIS] Triggering user activity analysis for u/${cleanUsername}`);

    // Check if user exists and get current analysis status
    const user = await prisma.redditUser.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please scrape user activity first.' },
        { status: 404 }
      );
    }

    // Check if analysis is already in progress
    if (user.analysisStatus === 'in_progress') {
      return NextResponse.json({
        success: false,
        error: 'User activity analysis already in progress',
        jobId: user.analysisJobId,
        status: user.analysisStatus,
      });
    }

    // Check if analysis was completed recently (within last 60 minutes)
    if (user.analysisStatus === 'completed' && user.analysisCompleted) {
      const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(user.analysisCompleted) > sixtyMinutesAgo) {
        return NextResponse.json({
          success: false,
          error: 'User activity analysis completed recently. Please wait before retrying.',
          status: user.analysisStatus,
        });
      }
    }

    // Count items to analyze
    const itemsToAnalyze = await prisma.redditUserComment.count({
      where: { 
        userId: user.id,
        analyzed: false,
        ...(limit && { id: { in: (await prisma.redditUserComment.findMany({
          where: { userId: user.id, analyzed: false },
          orderBy: { createdUtc: 'desc' },
          take: limit,
          select: { id: true },
        })).map(c => c.id) }})
      },
    });

    if (itemsToAnalyze === 0) {
      return NextResponse.json({
        success: false,
        error: 'No unanalyzed comments found for this user',
        status: 'completed',
      });
    }

    // Trigger the user activity analysis job
    const event = await inngest.send({
      name: 'reddit/analyze.user-activity',
      data: {
        username: cleanUsername,
        userId: user.id,
        analysisType,
        limit,
        triggeredBy: 'manual-api',
        timestamp: new Date().toISOString(),
      },
    });

    const jobId = event.ids[0];
    console.log(`[USER_ANALYSIS] User activity analysis triggered:`, jobId);

    // Update user record with analysis status
    await prisma.redditUser.update({
      where: { id: user.id },
      data: {
        analysisStatus: 'in_progress',
        analysisJobId: jobId,
        analysisStarted: new Date(),
        analysisCompleted: null,
        analysisError: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User activity analysis started',
      jobId,
      status: 'in_progress',
      username: cleanUsername,
      itemsToAnalyze,
    });
  } catch (error) {
    console.error('Error triggering user activity analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger user activity analysis' },
      { status: 500 }
    );
  }
}