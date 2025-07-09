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

    console.log('[HISTORICAL_RECOVERY_API] Starting historical recovery scraping');
    
    const body = await request.json().catch(() => ({}));
    const { forceRecovery = false } = body;

    // Trigger the historical recovery scraping
    const event = await inngest.send({
      name: "reddit/scrape.historical-recovery",
      data: {
        forceRecovery,
        timestamp: new Date().toISOString(),
        manual: true,
        triggered_by: "api"
      }
    });

    console.log('[HISTORICAL_RECOVERY_API] Historical recovery scraping triggered successfully');
    
    return NextResponse.json({
      success: true,
      message: "Historical recovery scraping triggered successfully. This will scrape posts from the past year for all active subreddits.",
      eventId: event.ids[0],
      timestamp: new Date().toISOString(),
      warning: "This is a comprehensive operation that may take 30-60 minutes to complete."
    });
  } catch (error) {
    console.error('[HISTORICAL_RECOVERY_API] Error triggering historical recovery:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/trigger-historical-recovery',
    method: 'POST',
    description: 'Trigger historical recovery scraping to go back 1 year for all active subreddits',
    usage: 'curl -X POST http://localhost:3000/api/trigger-historical-recovery',
    warning: 'This is a comprehensive operation that may take 30-60 minutes to complete.'
  });
}