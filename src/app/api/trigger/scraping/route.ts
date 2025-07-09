import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { inngest } from '../../../../lib/inngest';
import { getActiveSubredditNames } from '../../../../lib/subreddit-config';

export async function POST() {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pick a random subreddit for manual testing
    const activeSubreddits = await getActiveSubredditNames();
    const randomSubreddit = activeSubreddits[Math.floor(Math.random() * activeSubreddits.length)];
    
    // Trigger scraping
    const result = await inngest.send({
      name: 'reddit/scrape.subreddit',
      data: {
        subreddit: randomSubreddit,
        limit: 25,
        sort: 'hot',
        priority: 'manual',
      },
    });

    console.log(`[MANUAL_TRIGGER] Triggered scraping for r/${randomSubreddit}`);
    
    return NextResponse.json({ 
      success: true, 
      subreddit: randomSubreddit,
      eventId: result.ids[0],
      message: `Successfully triggered scraping for r/${randomSubreddit}` 
    });
  } catch (error) {
    console.error('[MANUAL_TRIGGER] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to trigger scraping' 
    }, { status: 500 });
  }
}