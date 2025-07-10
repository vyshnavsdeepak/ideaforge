import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/shared';
import { z } from 'zod';
import { authOptions } from '@/auth';
import { ensureAdminUser } from '@/auth';

const createBookmarkSchema = z.object({
  opportunityId: z.string(),
  collectionId: z.string(),
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
});


// Get all bookmarks for the current user
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
    const collectionId = searchParams.get('collectionId');
    const opportunityId = searchParams.get('opportunityId');

    const whereCondition: { userId: string; collectionId?: string; opportunityId?: string } = { userId: user.id };
    if (collectionId) {
      whereCondition.collectionId = collectionId;
    }
    if (opportunityId) {
      whereCondition.opportunityId = opportunityId;
    }

    const bookmarks = await prisma.opportunityBookmark.findMany({
      where: whereCondition,
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            description: true,
            overallScore: true,
            viabilityThreshold: true,
            businessType: true,
            industryVertical: true,
            niche: true,
            createdAt: true,
          },
        },
        collection: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
      orderBy: [{ collectionId: 'asc' }, { position: 'asc' }],
    });

    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
}

// Create a new bookmark
export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure admin user exists (handles cases where admin hasn't signed out/in after auth changes)
    const user = await ensureAdminUser();

    const body = await request.json();
    const validatedData = createBookmarkSchema.parse(body);

    // Check if opportunity exists
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: validatedData.opportunityId },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Check if collection exists and belongs to user
    const collection = await prisma.bookmarkCollection.findFirst({
      where: { 
        id: validatedData.collectionId,
        userId: user.id,
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if bookmark already exists
    const existingBookmark = await prisma.opportunityBookmark.findUnique({
      where: {
        userId_opportunityId_collectionId: {
          userId: user.id,
          opportunityId: validatedData.opportunityId,
          collectionId: validatedData.collectionId,
        },
      },
    });

    if (existingBookmark) {
      return NextResponse.json(
        { error: 'Opportunity already bookmarked in this collection' },
        { status: 409 }
      );
    }

    // Get the next position in the collection
    const lastBookmark = await prisma.opportunityBookmark.findFirst({
      where: { 
        userId: user.id,
        collectionId: validatedData.collectionId,
      },
      orderBy: { position: 'desc' },
    });

    const nextPosition = (lastBookmark?.position || 0) + 1;

    const bookmark = await prisma.opportunityBookmark.create({
      data: {
        userId: user.id,
        opportunityId: validatedData.opportunityId,
        collectionId: validatedData.collectionId,
        notes: validatedData.notes,
        rating: validatedData.rating,
        tags: validatedData.tags || [],
        position: nextPosition,
      },
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            description: true,
            overallScore: true,
            viabilityThreshold: true,
            businessType: true,
            industryVertical: true,
            niche: true,
            createdAt: true,
          },
        },
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

    return NextResponse.json({ bookmark });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to create bookmark' },
      { status: 500 }
    );
  }
}