import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { inngest } from '@/shared/services/inngest';

export async function POST() {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[RESTART_WORKFLOWS] Starting workflow restart');
    
    const restartResults = {
      triggered: [] as string[],
      errors: [] as string[],
    };

    // Trigger a fresh scraping workflow
    try {
      const scrapingEvent = await inngest.send({
        name: 'reddit/scrape.all-subreddits',
        data: {
          timestamp: new Date().toISOString(),
          manual: true,
          reason: 'workflow_restart',
        },
      });
      restartResults.triggered.push(`Scraping workflow: ${scrapingEvent.ids[0]}`);
    } catch (error) {
      restartResults.errors.push('Scraping workflow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Trigger a fresh analysis workflow for unprocessed posts
    try {
      const analysisEvent = await inngest.send({
        name: 'ai/mega-batch-analyze.opportunities',
        data: {
          timestamp: new Date().toISOString(),
          manual: true,
          reason: 'workflow_restart',
          force: true,
        },
      });
      restartResults.triggered.push(`Analysis workflow: ${analysisEvent.ids[0]}`);
    } catch (error) {
      restartResults.errors.push('Analysis workflow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Trigger deduplication workflow
    try {
      const deduplicationEvent = await inngest.send({
        name: 'admin/deduplication.cleanup',
        data: {
          timestamp: new Date().toISOString(),
          manual: true,
          reason: 'workflow_restart',
        },
      });
      restartResults.triggered.push(`Deduplication workflow: ${deduplicationEvent.ids[0]}`);
    } catch (error) {
      // Deduplication might not be an Inngest function, so this might fail
      restartResults.errors.push('Deduplication workflow: ' + (error instanceof Error ? error.message : 'Not available as Inngest function'));
    }

    console.log('[RESTART_WORKFLOWS] Workflow restart completed');
    
    return NextResponse.json({
      success: true,
      message: 'Workflow restart triggered',
      data: {
        triggered: restartResults.triggered,
        errors: restartResults.errors,
        timestamp: new Date().toISOString(),
        note: 'Workflows have been queued for execution. Check the jobs page for progress.',
      },
    });
    
  } catch (error) {
    console.error('[RESTART_WORKFLOWS] Workflow restart failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Workflow restart failed',
      },
      { status: 500 }
    );
  }
}