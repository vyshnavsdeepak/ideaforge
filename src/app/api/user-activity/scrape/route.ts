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

    const { username, scrapeType = 'full', limit, timeframe = 'all' } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username' },
        { status: 400 }
      );
    }

    // Clean username (remove u/ prefix if present)
    const cleanUsername = username.replace(/^u\//, '');

    console.log(`[USER_ACTIVITY] Triggering user activity scraping for u/${cleanUsername}`);

    // Check if user exists and get current scraping status
    const existingUser = await prisma.redditUser.findUnique({
      where: { username: cleanUsername },
    });

    // Check if scraping is already in progress
    if (existingUser?.scrapingStatus === 'in_progress') {
      return NextResponse.json({
        success: false,
        error: 'User activity scraping already in progress',
        jobId: existingUser.scrapingJobId,
        status: existingUser.scrapingStatus,
      });
    }

    // Check if scraping was completed recently (within last 30 minutes)
    if (existingUser?.scrapingStatus === 'completed' && existingUser.scrapingCompleted) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (new Date(existingUser.scrapingCompleted) > thirtyMinutesAgo) {
        return NextResponse.json({
          success: false,
          error: 'User activity scraping completed recently. Please wait before retrying.',
          status: existingUser.scrapingStatus,
        });
      }
    }

    // Trigger the user activity scraping job
    const event = await inngest.send({
      name: 'reddit/scrape.user-activity',
      data: {
        username: cleanUsername,
        scrapeType,
        limit,
        timeframe,
        triggeredBy: 'manual-api',
        timestamp: new Date().toISOString(),
      },
    });

    const jobId = event.ids[0];
    console.log(`[USER_ACTIVITY] User activity scraping triggered:`, jobId);

    // Create or update user record with scraping status
    await prisma.redditUser.upsert({
      where: { username: cleanUsername },
      update: {
        scrapingStatus: 'in_progress',
        scrapingJobId: jobId,
        scrapingStarted: new Date(),
        scrapingCompleted: null,
        scrapingError: null,
      },
      create: {
        username: cleanUsername,
        scrapingStatus: 'in_progress',
        scrapingJobId: jobId,
        scrapingStarted: new Date(),
      },
    });

    // Create scraping job record
    await prisma.userScrapingJob.create({
      data: {
        userId: existingUser?.id || '', // Will be updated by the job
        username: cleanUsername,
        scrapeType,
        limit,
        timeframe,
        status: 'in_progress',
        jobId,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User activity scraping started',
      jobId,
      status: 'in_progress',
      username: cleanUsername,
    });
  } catch (error) {
    console.error('Error triggering user activity scraping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger user activity scraping' },
      { status: 500 }
    );
  }
}