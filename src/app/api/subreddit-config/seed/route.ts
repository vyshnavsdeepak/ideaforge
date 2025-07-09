import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { seedDefaultSubreddits } from '../../../../lib/subreddit-config';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await seedDefaultSubreddits();

    return NextResponse.json({
      success: true,
      message: 'Default subreddits seeded successfully',
    });
  } catch (error) {
    console.error('Error seeding default subreddits:', error);
    return NextResponse.json(
      { error: 'Failed to seed default subreddits' },
      { status: 500 }
    );
  }
}