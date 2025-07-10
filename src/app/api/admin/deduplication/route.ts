import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { 
  getDeduplicationStats, 
  cleanupDuplicatePosts 
} from '@/shared';

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getDeduplicationStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[DEDUPLICATION] Error getting stats:', error);
    return NextResponse.json({ 
      error: 'Failed to get deduplication stats' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'cleanup') {
      console.log('[DEDUPLICATION] Starting cleanup process...');
      const result = await cleanupDuplicatePosts();
      
      console.log(`[DEDUPLICATION] Cleanup completed: ${result.deletedPosts} posts, ${result.deletedOpportunities} opportunities deleted`);
      
      return NextResponse.json({
        success: true,
        message: `Cleanup completed: ${result.deletedPosts} duplicate posts and ${result.deletedOpportunities} opportunities removed`,
        result
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });
  } catch (error) {
    console.error('[DEDUPLICATION] Error:', error);
    return NextResponse.json({ 
      error: 'Deduplication operation failed' 
    }, { status: 500 });
  }
}