import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';

interface SubredditConfigParams {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<SubredditConfigParams> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const subredditConfig = await prisma.subredditConfig.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!subredditConfig) {
      return NextResponse.json(
        { error: 'Subreddit configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: subredditConfig,
    });
  } catch (error) {
    console.error('Error fetching subreddit configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subreddit configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<SubredditConfigParams> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const updateData = await request.json();

    // Remove fields that shouldn't be updated
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, totalPostsScraped, opportunitiesFound, lastScraped, ...allowedUpdates } = updateData;

    // Clean subreddit name if provided
    if (allowedUpdates.name) {
      allowedUpdates.name = allowedUpdates.name.replace(/^r\//, '').toLowerCase();
      
      // Validate subreddit name format
      if (!/^[a-z0-9_]+$/i.test(allowedUpdates.name)) {
        return NextResponse.json(
          { error: 'Invalid subreddit name format' },
          { status: 400 }
        );
      }
    }

    const subredditConfig = await prisma.subredditConfig.update({
      where: { id: resolvedParams.id },
      data: allowedUpdates,
    });

    return NextResponse.json({
      success: true,
      data: subredditConfig,
    });
  } catch (error) {
    console.error('Error updating subreddit configuration:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Subreddit configuration not found' },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Subreddit name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update subreddit configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<SubredditConfigParams> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    await prisma.subredditConfig.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Subreddit configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting subreddit configuration:', error);
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Subreddit configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete subreddit configuration' },
      { status: 500 }
    );
  }
}