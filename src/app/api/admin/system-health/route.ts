import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[SYSTEM_HEALTH] Starting system health check');
    
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      components: {
        database: { status: 'unknown' as 'online' | 'offline' | 'degraded', message: '', responseTime: 0 },
        redis: { status: 'unknown' as 'online' | 'offline' | 'degraded', message: '', responseTime: 0 },
        inngest: { status: 'unknown' as 'online' | 'offline' | 'degraded', message: '', responseTime: 0 },
        reddit: { status: 'unknown' as 'online' | 'offline' | 'degraded', message: '', responseTime: 0 },
        gemini: { status: 'unknown' as 'online' | 'offline' | 'degraded', message: '', responseTime: 0 },
      },
      metrics: {
        totalPosts: 0,
        processedPosts: 0,
        totalOpportunities: 0,
        viableOpportunities: 0,
        failedPosts: 0,
        systemUptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    };

    // Test Database Connection
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbTime = Date.now() - dbStart;
      
      healthCheck.components.database = {
        status: 'online',
        message: 'Connected successfully',
        responseTime: dbTime,
      };
      
      // Get database metrics
      const [totalPosts, processedPosts, totalOpportunities, viableOpportunities, failedPosts] = await Promise.all([
        prisma.redditPost.count(),
        prisma.redditPost.count({ where: { processedAt: { not: null } } }),
        prisma.opportunity.count(),
        prisma.opportunity.count({ where: { viabilityThreshold: true } }),
        prisma.redditPost.count({ where: { processingError: { not: null } } }),
      ]);
      
      healthCheck.metrics = {
        ...healthCheck.metrics,
        totalPosts,
        processedPosts,
        totalOpportunities,
        viableOpportunities,
        failedPosts,
      };
      
    } catch (error) {
      healthCheck.components.database = {
        status: 'offline',
        message: error instanceof Error ? error.message : 'Database connection failed',
        responseTime: 0,
      };
      healthCheck.status = 'unhealthy';
    }

    // Test Reddit API (simple check)
    try {
      const redditStart = Date.now();
      const response = await fetch('https://www.reddit.com/r/test.json?limit=1', {
        headers: {
          'User-Agent': 'web:IdeaForge:v2.0.0 (by /u/ideaforge)',
        },
      });
      const redditTime = Date.now() - redditStart;
      
      if (response.ok) {
        healthCheck.components.reddit = {
          status: 'online',
          message: 'Reddit API accessible',
          responseTime: redditTime,
        };
      } else {
        healthCheck.components.reddit = {
          status: 'degraded',
          message: `Reddit API returned status ${response.status}`,
          responseTime: redditTime,
        };
      }
    } catch (error) {
      healthCheck.components.reddit = {
        status: 'offline',
        message: error instanceof Error ? error.message : 'Reddit API unreachable',
        responseTime: 0,
      };
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    }

    // Test Gemini AI (basic check)
    try {
      const geminiStart = Date.now();
      // Just check if the environment variable is set
      const hasGeminiKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const geminiTime = Date.now() - geminiStart;
      
      if (hasGeminiKey) {
        healthCheck.components.gemini = {
          status: 'online',
          message: 'Gemini AI configured',
          responseTime: geminiTime,
        };
      } else {
        healthCheck.components.gemini = {
          status: 'offline',
          message: 'Gemini AI key not configured',
          responseTime: geminiTime,
        };
        if (healthCheck.status === 'healthy') {
          healthCheck.status = 'degraded';
        }
      }
    } catch (error) {
      healthCheck.components.gemini = {
        status: 'offline',
        message: error instanceof Error ? error.message : 'Gemini AI check failed',
        responseTime: 0,
      };
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    }

    // Test Inngest (basic check)
    try {
      const inngestStart = Date.now();
      const hasInngestKey = !!process.env.INNGEST_EVENT_KEY;
      const inngestTime = Date.now() - inngestStart;
      
      if (hasInngestKey) {
        healthCheck.components.inngest = {
          status: 'online',
          message: 'Inngest configured',
          responseTime: inngestTime,
        };
      } else {
        healthCheck.components.inngest = {
          status: 'offline',
          message: 'Inngest key not configured',
          responseTime: inngestTime,
        };
        if (healthCheck.status === 'healthy') {
          healthCheck.status = 'degraded';
        }
      }
    } catch (error) {
      healthCheck.components.inngest = {
        status: 'offline',
        message: error instanceof Error ? error.message : 'Inngest check failed',
        responseTime: 0,
      };
      if (healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    }

    // Determine overall status
    const componentStatuses = Object.values(healthCheck.components).map(c => c.status);
    const offlineCount = componentStatuses.filter(s => s === 'offline').length;
    const degradedCount = componentStatuses.filter(s => s === 'degraded').length;
    
    if (offlineCount > 1) {
      healthCheck.status = 'unhealthy';
    } else if (offlineCount > 0 || degradedCount > 0) {
      healthCheck.status = 'degraded';
    } else {
      healthCheck.status = 'healthy';
    }

    console.log('[SYSTEM_HEALTH] Health check completed:', healthCheck.status);
    
    return NextResponse.json({
      success: true,
      data: healthCheck,
    });
    
  } catch (error) {
    console.error('[SYSTEM_HEALTH] Health check failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'System health check failed',
      },
      { status: 500 }
    );
  }
}