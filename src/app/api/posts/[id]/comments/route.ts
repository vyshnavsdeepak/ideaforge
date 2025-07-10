import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { CommentStorageService } from '@/reddit';
import { prisma } from '@/shared/services/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;

    // Check if post exists
    const post = await prisma.redditPost.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        title: true, 
        permalink: true,
        numComments: true 
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get stored comments
    const comments = await CommentStorageService.getPostComments(postId);
    const hasComments = await CommentStorageService.hasComments(postId);

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        permalink: post.permalink,
        totalComments: post.numComments
      },
      comments,
      hasComments,
      commentsCount: comments.length
    });

  } catch (error) {
    console.error('[COMMENTS_API] Error fetching comments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch comments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const { force = false } = await request.json();

    // Check if post exists and get permalink
    const post = await prisma.redditPost.findUnique({
      where: { id: postId },
      select: { 
        id: true, 
        permalink: true,
        title: true 
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (!post.permalink) {
      return NextResponse.json(
        { error: 'Post permalink not available' },
        { status: 400 }
      );
    }

    // Check if comments already exist (unless force refresh)
    if (!force) {
      const hasComments = await CommentStorageService.hasComments(postId);
      if (hasComments) {
        return NextResponse.json({
          success: true,
          message: 'Comments already fetched. Use force=true to refresh.',
          alreadyFetched: true
        });
      }
    }

    // Fetch and store comments
    console.log(`[COMMENTS_API] Fetching comments for post ${postId} (${post.title})`);
    
    const result = await CommentStorageService.fetchAndStoreComments(
      postId, 
      post.permalink
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch comments from Reddit',
          details: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comments fetched and stored successfully',
      commentsStored: result.commentsStored,
      commentsSkipped: result.commentsSkipped,
      force
    });

  } catch (error) {
    console.error('[COMMENTS_API] Error in POST:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch comments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}