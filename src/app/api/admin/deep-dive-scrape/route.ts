import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { DeepDiveScraper } from '@/reddit/services/deep-dive-scraper';
import { z } from 'zod';
import { inngest } from '@/shared/services/inngest';

const deepDiveRequestSchema = z.object({
  subreddit: z.string().min(1).max(50),
  targetDate: z.string().datetime(), // ISO string
  maxPosts: z.number().min(1).max(50000).optional(),
  sortTypes: z.array(z.enum(['hot', 'new', 'top', 'rising'])).optional(),
  timeframes: z.array(z.enum(['hour', 'day', 'week', 'month', 'year', 'all'])).optional(),
  includeComments: z.boolean().optional(),
  batchSize: z.number().min(25).max(100).optional(),
  delayBetweenRequests: z.number().min(500).max(5000).optional(),
  triggerImmediateAI: z.boolean().optional()
});

const estimateRequestSchema = z.object({
  subreddit: z.string().min(1).max(50),
  targetDate: z.string().datetime()
});

// POST: Start a deep dive scraping operation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = deepDiveRequestSchema.parse(body);
    
    const {
      subreddit,
      targetDate: targetDateStr,
      maxPosts,
      sortTypes = ['hot', 'new', 'top'],
      timeframes = ['week', 'month', 'year', 'all'],
      includeComments = false,
      batchSize = 100,
      delayBetweenRequests = 1000,
      triggerImmediateAI = false
    } = validatedData;

    const targetDate = new Date(targetDateStr);
    
    // Validate target date is not in the future
    if (targetDate > new Date()) {
      return NextResponse.json({ 
        error: 'Target date cannot be in the future' 
      }, { status: 400 });
    }

    // Validate target date is not too old (older than 5 years)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (targetDate < fiveYearsAgo) {
      return NextResponse.json({ 
        error: 'Target date cannot be older than 5 years' 
      }, { status: 400 });
    }

    console.log(`[DEEP_DIVE_API] Starting deep dive for r/${subreddit} back to ${targetDate.toISOString()}`);

    // Trigger the deep dive as an Inngest event for better handling
    const event = await inngest.send({
      name: "reddit/deep-dive.scrape",
      data: {
        subreddit,
        targetDate: targetDate.toISOString(),
        maxPosts,
        sortTypes,
        timeframes,
        includeComments,
        batchSize,
        delayBetweenRequests,
        triggerImmediateAI,
        triggeredBy: session.user?.email || 'unknown',
        requestTimestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Deep dive scraping initiated for r/${subreddit}`,
      eventId: event.ids[0],
      parameters: {
        subreddit,
        targetDate,
        maxPosts: maxPosts || 'unlimited',
        sortTypes,
        timeframes,
        includeComments,
        estimatedDuration: 'Will be calculated during execution'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    console.error('[DEEP_DIVE_API] Error starting deep dive:', error);
    return NextResponse.json({
      error: 'Failed to start deep dive scraping',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET: Estimate effort for a deep dive operation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subreddit = searchParams.get('subreddit');
    const targetDateStr = searchParams.get('targetDate');

    if (!subreddit || !targetDateStr) {
      return NextResponse.json({
        error: 'Missing required parameters: subreddit and targetDate'
      }, { status: 400 });
    }

    const validatedData = estimateRequestSchema.parse({
      subreddit,
      targetDate: targetDateStr
    });

    const targetDate = new Date(validatedData.targetDate);
    const scraper = new DeepDiveScraper();
    
    console.log(`[DEEP_DIVE_API] Estimating effort for r/${subreddit} back to ${targetDate.toISOString()}`);
    
    const estimate = await scraper.estimateDeepDiveEffort(subreddit, targetDate);

    return NextResponse.json({
      subreddit,
      targetDate,
      estimate: {
        ...estimate,
        warningMessage: estimate.estimatedPosts > 10000 
          ? 'This is a very large scraping operation that may take significant time and resources'
          : estimate.estimatedPosts > 5000
          ? 'This is a large scraping operation that may take considerable time'
          : 'This appears to be a manageable scraping operation'
      },
      recommendations: {
        maxPosts: estimate.estimatedPosts > 10000 ? 10000 : undefined,
        batchSize: estimate.estimatedPosts > 5000 ? 100 : 50,
        delayBetweenRequests: estimate.estimatedPosts > 5000 ? 1500 : 1000
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request parameters',
        details: error.errors
      }, { status: 400 });
    }

    console.error('[DEEP_DIVE_API] Error estimating deep dive:', error);
    return NextResponse.json({
      error: 'Failed to estimate deep dive effort',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}