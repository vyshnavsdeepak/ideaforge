import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '../../lib/prisma';
import { PostsPageContent } from '../../components/PostsPageContent';
import { Loader2 } from 'lucide-react';

interface RedditPostsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface RedditPost {
  id: string;
  redditId: string;
  title: string;
  content: string | null;
  author: string;
  subreddit: string;
  score: number;
  upvotes: number;
  downvotes: number;
  numComments: number;
  permalink: string | null;
  createdUtc: Date;
  processedAt: Date | null;
  processingError: string | null;
  createdAt: Date;
  updatedAt: Date;
  opportunitySources: Array<{
    id: string;
    confidence: number;
    sourceType: string;
    opportunity: {
      id: string;
      title: string;
      overallScore: number;
      viabilityThreshold: boolean;
      createdAt: Date;
    };
  }>;
}

interface PostsData {
  posts: RedditPost[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    total: number;
    processed: number;
    unprocessed: number;
    failed: number;
  };
  subreddits: Array<{
    name: string;
    count: number;
  }>;
}

function getProcessingStatus(post: RedditPost): 'processed' | 'unprocessed' | 'failed' | 'processing' {
  if (post.processingError) {
    return 'failed';
  }
  if (post.processedAt) {
    return 'processed';
  }
  // Check if post was recently scraped but not yet processed (within last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (post.createdAt > fiveMinutesAgo && !post.processedAt) {
    return 'processing';
  }
  return 'unprocessed';
}

async function getPostsData(searchParams: { [key: string]: string | string[] | undefined }): Promise<PostsData> {
  // Parse query parameters
  const page = parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1');
  const limit = parseInt(typeof searchParams.limit === 'string' ? searchParams.limit : '20');
  const subreddit = typeof searchParams.subreddit === 'string' ? searchParams.subreddit : '';
  const status = typeof searchParams.status === 'string' ? searchParams.status : '';
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const sortBy = typeof searchParams.sortBy === 'string' ? searchParams.sortBy : 'createdAt';
  const sortOrder = typeof searchParams.sortOrder === 'string' ? searchParams.sortOrder : 'desc';
  const author = typeof searchParams.author === 'string' ? searchParams.author : '';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (subreddit) {
    where.subreddit = subreddit;
  }

  if (author) {
    where.author = author;
  }

  if (status) {
    switch (status) {
      case 'processed':
        where.processedAt = { not: null };
        break;
      case 'unprocessed':
        where.processedAt = null;
        break;
      case 'failed':
        where.processingError = { not: null };
        break;
    }
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { author: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Build orderBy clause
  const orderBy: Record<string, string> = {};
  orderBy[sortBy] = sortOrder;

  // Fetch posts with related opportunities
  const [posts, totalCount] = await Promise.all([
    prisma.redditPost.findMany({
      where,
      include: {
        opportunitySources: {
          select: {
            id: true,
            confidence: true,
            sourceType: true,
            opportunity: {
              select: {
                id: true,
                title: true,
                overallScore: true,
                viabilityThreshold: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.redditPost.count({ where }),
  ]);

  // Calculate processing status and opportunities for each post
  const postsWithStatus = posts.map(post => {
    const opportunities = post.opportunitySources.map(src => src.opportunity);
    return {
      ...post,
      status: getProcessingStatus(post),
      opportunityCount: opportunities.length,
      viableOpportunityCount: opportunities.filter(opp => opp.viabilityThreshold).length,
      opportunities: opportunities,
    };
  });

  // Get summary statistics
  const stats = await Promise.all([
    prisma.redditPost.count(),
    prisma.redditPost.count({ where: { processedAt: { not: null } } }),
    prisma.redditPost.count({ where: { processedAt: null } }),
    prisma.redditPost.count({ where: { processingError: { not: null } } }),
  ]);

  const [totalPosts, processedPosts, unprocessedPosts, failedPosts] = stats;

  // Get available subreddits for filtering
  const subreddits = await prisma.redditPost.groupBy({
    by: ['subreddit'],
    _count: {
      subreddit: true,
    },
    orderBy: {
      _count: {
        subreddit: 'desc',
      },
    },
  });

  return {
    posts: postsWithStatus,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    },
    stats: {
      total: totalPosts,
      processed: processedPosts,
      unprocessed: unprocessedPosts,
      failed: failedPosts,
    },
    subreddits: subreddits.map(s => ({
      name: s.subreddit,
      count: s._count.subreddit,
    })),
  };
}

export default async function RedditPostsPage({ searchParams }: RedditPostsPageProps) {
  try {
    const resolvedSearchParams = await searchParams;
    const data = await getPostsData(resolvedSearchParams);
    
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading Reddit posts...</p>
            </div>
          </div>
        }
      >
        <PostsPageContent 
          initialData={data} 
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading Reddit posts:', error);
    notFound();
  }
}

// Add metadata for SEO
export async function generateMetadata({ searchParams }: RedditPostsPageProps) {
  const resolvedSearchParams = await searchParams;
  const subreddit = typeof resolvedSearchParams.subreddit === 'string' ? resolvedSearchParams.subreddit : '';
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : '';
  
  let title = 'Reddit Posts';
  let description = 'Browse Reddit posts scraped for AI business opportunity analysis';
  
  if (subreddit) {
    title = `Reddit Posts from r/${subreddit}`;
    description = `Browse Reddit posts from r/${subreddit} scraped for AI business opportunity analysis`;
  }
  
  if (search) {
    title = `Reddit Posts: "${search}"`;
    description = `Search results for "${search}" in Reddit posts`;
  }
  
  if (status) {
    title = `${status.charAt(0).toUpperCase() + status.slice(1)} Reddit Posts`;
    description = `Browse ${status} Reddit posts from AI analysis pipeline`;
  }
  
  return {
    title,
    description,
  };
}