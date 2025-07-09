import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';
import { authOptions } from '../../auth/[...nextauth]/route';
import { ensureAdminUser } from '../../../../lib/ensure-admin-user';

const createCollectionSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// Get all collections for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure admin user exists (handles cases where admin hasn't signed out/in after auth changes)
    const user = await ensureAdminUser();

    const collections = await prisma.bookmarkCollection.findMany({
      where: { userId: user.id },
      include: {
        bookmarks: {
          include: {
            opportunity: {
              select: {
                id: true,
                title: true,
                overallScore: true,
                viabilityThreshold: true,
                businessType: true,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

// Create a new collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure admin user exists (handles cases where admin hasn't signed out/in after auth changes)
    const user = await ensureAdminUser();

    const body = await request.json();
    const validatedData = createCollectionSchema.parse(body);

    // Check if collection name already exists for this user
    const existingCollection = await prisma.bookmarkCollection.findUnique({
      where: { 
        userId_name: { 
          userId: user.id, 
          name: validatedData.name 
        } 
      },
    });

    if (existingCollection) {
      return NextResponse.json(
        { error: 'A collection with this name already exists' },
        { status: 409 }
      );
    }

    const collection = await prisma.bookmarkCollection.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color,
        icon: validatedData.icon,
        isPublic: validatedData.isPublic ?? false,
      },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    return NextResponse.json({ collection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}