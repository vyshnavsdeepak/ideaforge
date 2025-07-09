import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const subreddits = await prisma.subredditConfig.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        isActive: true,
        priority: true,
        scrapeFrequency: true,
        maxPosts: true,
        sortBy: true,
        description: true,
        category: true,
        totalPostsScraped: true,
        opportunitiesFound: true,
        lastScraped: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: subreddits,
    });
  } catch (error) {
    console.error('Error fetching subreddit configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subreddit configurations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      isActive = true,
      priority = 'medium',
      scrapeFrequency = 'hourly',
      maxPosts = 25,
      sortBy = 'hot',
      description,
      category,
    } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Subreddit name is required' },
        { status: 400 }
      );
    }

    // Clean the subreddit name (remove r/ prefix if present)
    const cleanName = name.replace(/^r\//, '').toLowerCase();

    // Validate subreddit name format
    if (!/^[a-z0-9_]+$/i.test(cleanName)) {
      return NextResponse.json(
        { error: 'Invalid subreddit name format' },
        { status: 400 }
      );
    }

    // Create the subreddit configuration
    const subredditConfig = await prisma.subredditConfig.create({
      data: {
        name: cleanName,
        isActive,
        priority,
        scrapeFrequency,
        maxPosts,
        sortBy,
        description,
        category,
      },
    });

    return NextResponse.json({
      success: true,
      data: subredditConfig,
    });
  } catch (error) {
    console.error('Error creating subreddit configuration:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Subreddit already exists in configuration' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subreddit configuration' },
      { status: 500 }
    );
  }
}