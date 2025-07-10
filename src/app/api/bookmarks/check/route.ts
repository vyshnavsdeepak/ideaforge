import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';
import { authOptions } from '../../../../lib/auth-options';
import { ensureAdminUser } from '../../../../lib/ensure-admin-user';

// Check if an opportunity is bookmarked and get bookmark status
export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure admin user exists (handles cases where admin hasn't signed out/in after auth changes)
    const user = await ensureAdminUser();

    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunityId');

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
    }

    // Get all bookmarks for this opportunity
    const bookmarks = await prisma.opportunityBookmark.findMany({
      where: { 
        userId: user.id,
        opportunityId: opportunityId,
      },
      include: {
        collection: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    // Get all collections for the dropdown
    const collections = await prisma.bookmarkCollection.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ 
      isBookmarked: bookmarks.length > 0,
      bookmarks,
      collections,
    });
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return NextResponse.json(
      { error: 'Failed to check bookmark status' },
      { status: 500 }
    );
  }
}

// Quick bookmark/unbookmark action
export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure admin user exists (handles cases where admin hasn't signed out/in after auth changes)
    const user = await ensureAdminUser();

    const { opportunityId, collectionId, action } = await request.json();

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
    }

    if (action === 'bookmark') {
      // Add to collection or default collection
      let targetCollectionId = collectionId;
      
      if (!targetCollectionId) {
        // Create or get default collection
        let defaultCollection = await prisma.bookmarkCollection.findFirst({
          where: { 
            userId: user.id,
            name: 'Saved Opportunities',
          },
        });

        if (!defaultCollection) {
          defaultCollection = await prisma.bookmarkCollection.create({
            data: {
              userId: user.id,
              name: 'Saved Opportunities',
              description: 'Default collection for saved opportunities',
              icon: '⭐',
            },
          });
        }

        targetCollectionId = defaultCollection.id;
      }

      // Check if already bookmarked in this collection
      const existingBookmark = await prisma.opportunityBookmark.findUnique({
        where: {
          userId_opportunityId_collectionId: {
            userId: user.id,
            opportunityId: opportunityId,
            collectionId: targetCollectionId,
          },
        },
      });

      if (existingBookmark) {
        return NextResponse.json(
          { error: 'Already bookmarked in this collection' },
          { status: 409 }
        );
      }

      // Get the next position in the collection
      const lastBookmark = await prisma.opportunityBookmark.findFirst({
        where: { 
          userId: user.id,
          collectionId: targetCollectionId,
        },
        orderBy: { position: 'desc' },
      });

      const nextPosition = (lastBookmark?.position || 0) + 1;

      const bookmark = await prisma.opportunityBookmark.create({
        data: {
          userId: user.id,
          opportunityId: opportunityId,
          collectionId: targetCollectionId,
          position: nextPosition,
        },
        include: {
          collection: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      });

      return NextResponse.json({ 
        success: true,
        action: 'bookmarked',
        bookmark,
      });
    } else if (action === 'unbookmark') {
      // Remove from specific collection or all collections
      if (collectionId) {
        await prisma.opportunityBookmark.deleteMany({
          where: {
            userId: user.id,
            opportunityId: opportunityId,
            collectionId: collectionId,
          },
        });
      } else {
        await prisma.opportunityBookmark.deleteMany({
          where: {
            userId: user.id,
            opportunityId: opportunityId,
          },
        });
      }

      return NextResponse.json({ 
        success: true,
        action: 'unbookmarked',
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing bookmark action:', error);
    return NextResponse.json(
      { error: 'Failed to process bookmark action' },
      { status: 500 }
    );
  }
}