import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../../lib/prisma';
import { z } from 'zod';
import { authOptions } from '../../../auth/[...nextauth]/route';

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// Get a specific collection by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const collection = await prisma.bookmarkCollection.findFirst({
      where: { 
        id: id,
        userId: user.id,
      },
      include: {
        bookmarks: {
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
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    return NextResponse.json({ collection });
  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

// Update a collection
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateCollectionSchema.parse(body);

    // Check if collection exists and belongs to user
    const existingCollection = await prisma.bookmarkCollection.findFirst({
      where: { 
        id: id,
        userId: user.id,
      },
    });

    if (!existingCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // If name is being updated, check for conflicts
    if (validatedData.name && validatedData.name !== existingCollection.name) {
      const conflictingCollection = await prisma.bookmarkCollection.findUnique({
        where: { 
          userId_name: { 
            userId: user.id, 
            name: validatedData.name 
          } 
        },
      });

      if (conflictingCollection) {
        return NextResponse.json(
          { error: 'A collection with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updatedCollection = await prisma.bookmarkCollection.update({
      where: { id: id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color,
        icon: validatedData.icon,
        isPublic: validatedData.isPublic,
      },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    return NextResponse.json({ collection: updatedCollection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating collection:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}

// Delete a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if collection exists and belongs to user
    const existingCollection = await prisma.bookmarkCollection.findFirst({
      where: { 
        id: id,
        userId: user.id,
      },
    });

    if (!existingCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Delete the collection (bookmarks will be cascade deleted)
    await prisma.bookmarkCollection.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}