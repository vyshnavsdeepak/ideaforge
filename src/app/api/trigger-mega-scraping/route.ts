import { inngest } from '@/shared';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('[MANUAL_TRIGGER] Starting manual mega-batch scraping');
    
    // Trigger the mega-batch scraping
    const event = await inngest.send({
      name: "reddit/scrape.all-subreddits",
      data: {
        timestamp: new Date().toISOString(),
        manual: true,
        triggered_by: "api"
      }
    });

    console.log('[MANUAL_TRIGGER] Mega-batch scraping triggered successfully');
    
    return NextResponse.json({
      success: true,
      message: "Mega-batch scraping triggered successfully",
      eventId: event.ids[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MANUAL_TRIGGER] Error triggering mega-batch scraping:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/trigger-mega-scraping',
    method: 'POST',
    description: 'Manually trigger mega-batch scraping for all subreddits',
    usage: 'curl -X POST http://localhost:3000/api/trigger-mega-scraping'
  });
}