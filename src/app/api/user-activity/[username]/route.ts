import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

interface UserActivityParams {
  username: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<UserActivityParams> }
) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || 'all'; // 'all', 'posts', 'comments'
    const sortBy = searchParams.get('sortBy') || 'createdUtc';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;
    const cleanUsername = resolvedParams.username.replace(/^u\//, '');

    // Get user record
    const user = await prisma.redditUser.findUnique({
      where: { username: cleanUsername },
      select: {
        id: true,
        username: true,
        profileData: true,
        accountCreated: true,
        linkKarma: true,
        commentKarma: true,
        totalKarma: true,
        lastScraped: true,
        postsScraped: true,
        commentsScraped: true,
        scrapingStatus: true,
        scrapingJobId: true,
        scrapingStarted: true,
        scrapingCompleted: true,
        scrapingError: true,
        analysisStatus: true,
        analysisJobId: true,
        analysisStarted: true,
        analysisCompleted: true,
        analysisError: true,
        opportunitiesFound: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build orderBy clause
    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortOrder;

    // Fetch posts and comments based on type
    let posts: Array<{
      id: string;
      redditId: string;
      title: string;
      content: string | null;
      url: string | null;
      permalink: string;
      subreddit: string;
      score: number;
      upvotes: number;
      downvotes: number;
      numComments: number;
      createdUtc: Date;
      isVideo: boolean;
      isImage: boolean;
      isLink: boolean;
      isSelf: boolean;
      analyzed: boolean;
      isOpportunity: boolean | null;
      opportunityId: string | null;
      createdAt: Date;
    }> = [];
    let comments: Array<{
      id: string;
      redditId: string;
      body: string;
      permalink: string | null;
      subreddit: string;
      score: number;
      createdUtc: Date;
      postId: string | null;
      postTitle: string | null;
      parentId: string | null;
      isTopLevel: boolean;
      analyzed: boolean;
      isOpportunity: boolean | null;
      opportunityId: string | null;
      createdAt: Date;
    }> = [];
    let totalPosts = 0;
    let totalComments = 0;

    if (type === 'all' || type === 'posts') {
      const [userPosts, postsCount] = await Promise.all([
        prisma.redditUserPost.findMany({
          where: { userId: user.id },
          orderBy,
          skip: type === 'posts' ? skip : 0,
          take: type === 'posts' ? limit : undefined,
          select: {
            id: true,
            redditId: true,
            title: true,
            content: true,
            url: true,
            permalink: true,
            subreddit: true,
            score: true,
            upvotes: true,
            downvotes: true,
            numComments: true,
            createdUtc: true,
            isVideo: true,
            isImage: true,
            isLink: true,
            isSelf: true,
            analyzed: true,
            isOpportunity: true,
            opportunityId: true,
            createdAt: true,
          },
        }),
        prisma.redditUserPost.count({ where: { userId: user.id } }),
      ]);
      
      posts = userPosts;
      totalPosts = postsCount;
    }

    if (type === 'all' || type === 'comments') {
      const [userComments, commentsCount] = await Promise.all([
        prisma.redditUserComment.findMany({
          where: { userId: user.id },
          orderBy,
          skip: type === 'comments' ? skip : 0,
          take: type === 'comments' ? limit : undefined,
          select: {
            id: true,
            redditId: true,
            body: true,
            permalink: true,
            subreddit: true,
            score: true,
            createdUtc: true,
            postId: true,
            postTitle: true,
            parentId: true,
            isTopLevel: true,
            analyzed: true,
            isOpportunity: true,
            opportunityId: true,
            createdAt: true,
          },
        }),
        prisma.redditUserComment.count({ where: { userId: user.id } }),
      ]);
      
      comments = userComments;
      totalComments = commentsCount;
    }

    // Get recent scraping jobs
    const scrapingJobs = await prisma.userScrapingJob.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        scrapeType: true,
        status: true,
        startedAt: true,
        completedAt: true,
        postsScraped: true,
        commentsScraped: true,
        newPosts: true,
        newComments: true,
        error: true,
      },
    });

    // Calculate statistics
    const stats = {
      totalPosts,
      totalComments,
      totalActivity: totalPosts + totalComments,
      analyzedPosts: await prisma.redditUserPost.count({
        where: { userId: user.id, analyzed: true },
      }),
      analyzedComments: await prisma.redditUserComment.count({
        where: { userId: user.id, analyzed: true },
      }),
      opportunityPosts: await prisma.redditUserPost.count({
        where: { userId: user.id, isOpportunity: true },
      }),
      opportunityComments: await prisma.redditUserComment.count({
        where: { userId: user.id, isOpportunity: true },
      }),
    };

    // Get subreddit distribution
    const subredditStats = await prisma.$queryRaw`
      SELECT subreddit, COUNT(*)::int as count, 'post' as type
      FROM "RedditUserPost" 
      WHERE "userId" = ${user.id}
      GROUP BY subreddit
      UNION ALL
      SELECT subreddit, COUNT(*)::int as count, 'comment' as type
      FROM "RedditUserComment"
      WHERE "userId" = ${user.id}
      GROUP BY subreddit
      ORDER BY count DESC
      LIMIT 20
    ` as Array<{ subreddit: string; count: number; type: string }>;

    // Combined activity for 'all' type
    let combinedActivity: Array<{
      type: 'post' | 'comment';
      [key: string]: unknown;
    }> = [];
    if (type === 'all') {
      // Mix posts and comments, then sort and paginate
      const allActivity = [
        ...posts.map(post => ({ ...post, type: 'post' as const })),
        ...comments.map(comment => ({ ...comment, type: 'comment' as const })),
      ];
      
      // Sort by createdUtc desc
      allActivity.sort((a, b) => new Date(b.createdUtc).getTime() - new Date(a.createdUtc).getTime());
      
      // Paginate
      combinedActivity = allActivity.slice(skip, skip + limit);
    }

    const totalItems = type === 'posts' ? totalPosts : type === 'comments' ? totalComments : totalPosts + totalComments;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      data: {
        user,
        posts: type === 'posts' ? posts : type === 'all' ? combinedActivity.filter(item => item.type === 'post') : [],
        comments: type === 'comments' ? comments : type === 'all' ? combinedActivity.filter(item => item.type === 'comment') : [],
        activity: type === 'all' ? combinedActivity : [],
        stats,
        subredditStats,
        scrapingJobs,
        pagination: {
          page,
          limit,
          totalCount: totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}