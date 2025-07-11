import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/shared/services/inngest';
import { ensureAdminUser } from '@/auth/services/ensure-admin-user';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated and is an admin
    await ensureAdminUser();
    
    const body = await request.json();
    const { batchSize = 10, skipExisting = true } = body;
    
    // Validate batch size
    if (batchSize < 1 || batchSize > 50) {
      return NextResponse.json(
        { error: 'Batch size must be between 1 and 50' },
        { status: 400 }
      );
    }
    
    // Trigger the backfill job
    const result = await inngest.send({
      name: 'ai/backfill-opportunity-solutions',
      data: {
        batchSize,
        skipExisting,
        triggeredBy: 'admin-api',
        triggeredAt: new Date().toISOString()
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Backfill job triggered successfully',
      jobId: result.ids[0],
      batchSize,
      skipExisting
    });
    
  } catch (error) {
    console.error('Error triggering backfill job:', error);
    
    if (error instanceof Error && error.message.includes('Not authenticated')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to trigger backfill job' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Ensure user is authenticated and is an admin
    await ensureAdminUser();
    
    // Get count of opportunities missing solution data
    const { prisma } = await import('@/shared/services/prisma');
    
    const missingData = await prisma.opportunity.count({
      where: {
        OR: [
          { makeshiftSolution: { equals: Prisma.JsonNull } },
          { softwareSolution: { equals: Prisma.JsonNull } },
          { deltaComparison: { equals: Prisma.JsonNull } }
        ]
      }
    });
    
    const totalOpportunities = await prisma.opportunity.count();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalOpportunities,
        missingData,
        needsBackfill: missingData > 0
      }
    });
    
  } catch (error) {
    console.error('Error getting backfill stats:', error);
    
    if (error instanceof Error && error.message.includes('Not authenticated')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get backfill stats' },
      { status: 500 }
    );
  }
}