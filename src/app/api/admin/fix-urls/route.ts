import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { formatRedditUrl } from '../../../../lib/reddit-utils';

export async function POST() {
  try {
    // Get all reddit posts with malformed URLs
    const posts = await prisma.redditPost.findMany({
      where: {
        permalink: {
          not: null,
        },
      },
    });

    let fixedCount = 0;

    for (const post of posts) {
      if (post.permalink) {
        const formattedUrl = formatRedditUrl(post.permalink);
        
        // Only update if the URL was actually changed
        if (formattedUrl && formattedUrl !== post.permalink) {
          await prisma.redditPost.update({
            where: { id: post.id },
            data: { permalink: formattedUrl },
          });
          fixedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalPosts: posts.length,
      fixedCount,
      message: `Fixed ${fixedCount} URLs out of ${posts.length} posts`,
    });
  } catch (error) {
    console.error('Error fixing URLs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fix URLs' },
      { status: 500 }
    );
  }
}