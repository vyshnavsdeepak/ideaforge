import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { inngest } from '../../../../lib/inngest';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[MARKET_INTELLIGENCE] Triggering market demand analysis');

    // Trigger the market demand analysis job
    const event = await inngest.send({
      name: 'market/analyze.demands',
      data: {
        triggeredBy: 'manual-refresh',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('[MARKET_INTELLIGENCE] Analysis triggered:', event.ids[0]);

    return NextResponse.json({
      success: true,
      message: 'Market demand analysis triggered',
      eventId: event.ids[0],
    });
  } catch (error) {
    console.error('Error triggering market intelligence refresh:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger market intelligence refresh' },
      { status: 500 }
    );
  }
}