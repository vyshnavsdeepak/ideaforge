import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { cleanRedditUrl } from '../../../../lib/reddit-utils';

export async function POST() {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[FIX_URLS] Starting URL cleanup process...');

    // Get all Reddit posts with potentially malformed URLs
    const posts = await prisma.redditPost.findMany({
      where: {
        permalink: {
          not: null
        }
      },
      select: {
        id: true,
        permalink: true,
        redditId: true,
        title: true
      }
    });

    console.log(`[FIX_URLS] Found ${posts.length} posts to check`);

    let fixedCount = 0;
    const fixedPosts = [];

    for (const post of posts) {
      if (post.permalink) {
        const originalUrl = post.permalink;
        const cleanedUrl = cleanRedditUrl(post.permalink);
        
        // Check if URL needed fixing
        if (originalUrl !== cleanedUrl) {
          console.log(`[FIX_URLS] Fixing URL for post ${post.redditId}:`);
          console.log(`  Original: ${originalUrl}`);
          console.log(`  Fixed:    ${cleanedUrl}`);
          
          // Update the post
          await prisma.redditPost.update({
            where: { id: post.id },
            data: { permalink: cleanedUrl }
          });
          
          fixedCount++;
          fixedPosts.push({
            redditId: post.redditId,
            title: post.title.substring(0, 50),
            originalUrl,
            fixedUrl: cleanedUrl
          });
        }
      }
    }

    console.log(`[FIX_URLS] Fixed ${fixedCount} malformed URLs`);

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} malformed URLs out of ${posts.length} posts`,
      fixedCount,
      totalPosts: posts.length,
      fixedPosts: fixedPosts.slice(0, 10) // Return first 10 examples
    });

  } catch (error) {
    console.error('[FIX_URLS] Error:', error);
    return NextResponse.json({ 
      error: 'URL fix operation failed' 
    }, { status: 500 });
  }
}