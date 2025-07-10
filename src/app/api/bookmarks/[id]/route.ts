import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/shared';
import { z } from 'zod';
import { authOptions } from '@/auth';
import { ensureAdminUser } from '@/auth';

const updateBookmarkSchema = z.object({
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  position: z.number().optional(),
});

// Get a specific bookmark by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure admin user exists (handles cases where admin hasn't signed out/in after auth changes)
    const user = await ensureAdminUser();

    const bookmark = await prisma.opportunityBookmark.findFirst({
      where: { 
        id: id,
        userId: user.id,
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

    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    return NextResponse.json({ bookmark });
  } catch (error) {
    console.error('Error fetching bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookmark' },
      { status: 500 }
    );
  }
}

// Update a bookmark
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure admin user exists (handles cases where admin hasn't signed out/in after auth changes)
    const user = await ensureAdminUser();

    const body = await request.json();
    const validatedData = updateBookmarkSchema.parse(body);

    // Check if bookmark exists and belongs to user
    const existingBookmark = await prisma.opportunityBookmark.findFirst({
      where: { 
        id: id,
        userId: user.id,
      },
    });

    if (!existingBookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    const updatedBookmark = await prisma.opportunityBookmark.update({
      where: { id: id },
      data: {
        notes: validatedData.notes,
        rating: validatedData.rating,
        tags: validatedData.tags,
        position: validatedData.position,
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

    return NextResponse.json({ bookmark: updatedBookmark });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to update bookmark' },
      { status: 500 }
    );
  }
}

// Delete a bookmark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure admin user exists (handles cases where admin hasn't signed out/in after auth changes)
    const user = await ensureAdminUser();

    // Check if bookmark exists and belongs to user
    const existingBookmark = await prisma.opportunityBookmark.findFirst({
      where: { 
        id: id,
        userId: user.id,
      },
    });

    if (!existingBookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    // Delete the bookmark
    await prisma.opportunityBookmark.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}