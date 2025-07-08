import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';

const searchSchema = z.object({
  search: z.string().optional(),
  subreddit: z.string().optional(),
  minScore: z.coerce.number().min(0).max(10).optional(),
  sortBy: z.enum(['score', 'date', 'subreddit']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);
    
    const validatedParams = searchSchema.parse(params);
    
    const {
      search,
      subreddit,
      minScore = 0,
      sortBy = 'score',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = validatedParams;

    // Build where clause for filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { proposedSolution: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (subreddit) {
      whereClause.subreddit = subreddit;
    }

    if (minScore > 0) {
      whereClause.overallScore = { gte: minScore };
    }

    // Build order clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderClause: any = {};
    if (sortBy === 'score') {
      orderClause.overallScore = sortOrder;
    } else if (sortBy === 'date') {
      orderClause.createdAt = sortOrder;
    } else if (sortBy === 'subreddit') {
      orderClause.subreddit = sortOrder;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalCount = await prisma.opportunity.count({
      where: whereClause,
    });

    // Get opportunities with pagination
    const opportunities = await prisma.opportunity.findMany({
      where: whereClause,
      include: {
        redditPosts: {
          include: {
            redditPost: {
              select: {
                id: true,
                title: true,
                author: true,
                score: true,
                numComments: true,
                permalink: true,
                subreddit: true,
                createdUtc: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: [
        // Primary sort
        orderClause,
        // Secondary sort by source count (more sources = higher validation)
        { sourceCount: 'desc' },
      ],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      opportunities,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
      },
      filters: {
        search,
        subreddit,
        minScore,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}