import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { aggregateDailyUsage } from '@/ai';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, date } = body;

    if (action === 'aggregate') {
      // Trigger daily aggregation for a specific date
      const aggregationDate = date ? new Date(date) : new Date();
      aggregationDate.setHours(0, 0, 0, 0);
      
      console.log(`[AGGREGATE_DAILY] Triggering daily aggregation for ${aggregationDate.toISOString()}`);
      
      await aggregateDailyUsage(aggregationDate);
      
      return NextResponse.json({
        success: true,
        message: 'Daily aggregation completed successfully',
        date: aggregationDate.toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'refresh') {
      // Refresh aggregation for the last 7 days
      const today = new Date();
      const promises = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        promises.push(aggregateDailyUsage(date));
      }
      
      await Promise.all(promises);
      
      return NextResponse.json({
        success: true,
        message: 'Aggregation refreshed for last 7 days',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "aggregate" or "refresh"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[AGGREGATE_DAILY] Failed to process daily aggregation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process daily aggregation',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}