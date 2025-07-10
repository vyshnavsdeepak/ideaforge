import { NextResponse } from 'next/server';
import { inngest } from '@/shared';
import { getActiveSubredditNames } from '@/reddit';

export async function POST() {
  try {
    // Get active subreddits and use the first one
    const activeSubreddits = await getActiveSubredditNames();
    const subreddit = activeSubreddits[0] || 'entrepreneur'; // Use first active subreddit or fallback
    
    // Trigger scraping for a test subreddit
    const result = await inngest.send({
      name: "reddit/scrape.subreddit",
      data: {
        subreddit: subreddit,
        limit: 10,
      }
    });

    return NextResponse.json({ 
      success: true, 
      subreddit: subreddit,
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