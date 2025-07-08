import { NextResponse } from 'next/server';
import { inngest } from '../../../lib/inngest';

export async function POST() {
  try {
    // Trigger scraping for a test subreddit
    const result = await inngest.send({
      name: "reddit/scrape.subreddit",
      data: {
        subreddit: "entrepreneur",
        limit: 10,
      }
    });

    return NextResponse.json({ 
      success: true, 
      subreddit: "entrepreneur",
      eventId: result.ids[0]
    });
  } catch (error) {
    console.error('Error triggering scraping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger scraping' },
      { status: 500 }
    );
  }
}