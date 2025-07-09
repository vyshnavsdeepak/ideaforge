import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '../../lib/prisma';
import { OpportunitiesPageContent } from '../../components/OpportunitiesPageContent';
import { Loader2 } from 'lucide-react';

interface OpportunitiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  currentSolution: string | null;
  proposedSolution: string;
  marketContext: string | null;
  implementationNotes: string | null;
  speedScore: number;
  convenienceScore: number;
  trustScore: number;
  priceScore: number;
  statusScore: number;
  predictabilityScore: number;
  uiUxScore: number;
  easeOfUseScore: number;
  legalFrictionScore: number;
  emotionalComfortScore: number;
  overallScore: number;
  viabilityThreshold: boolean;
  subreddit: string;
  marketSize: string | null;
  complexity: string | null;
  successProbability: string | null;
  businessType: string | null;
  businessModel: string | null;
  revenueModel: string | null;
  platform: string | null;
  targetAudience: string | null;
  industryVertical: string | null;
  niche: string | null;
  createdAt: Date;
  updatedAt: Date;
  redditPosts: Array<{
    id: string;
    sourceType: string;
    confidence: number;
    redditPost: {
      id: string;
      title: string;
      author: string;
      score: number;
      upvotes: number;
      downvotes: number;
      numComments: number;
      permalink: string | null;
      subreddit: string;
      createdUtc: Date;
    };
  }>;
}

interface OpportunitiesData {
  opportunities: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats: {
    total: number;
    viable: number;
    avgScore: number;
  };
  filters: {
    subreddits: string[];
    businessTypes: string[];
    platforms: string[];
    targetAudiences: string[];
    industryVerticals: string[];
    niches: string[];
  };
}

async function getOpportunitiesData(searchParams: { [key: string]: string | string[] | undefined }): Promise<OpportunitiesData> {
  // Parse query parameters
  const page = parseInt(typeof searchParams.page === 'string' ? searchParams.page : '1');
  const limit = parseInt(typeof searchParams.limit === 'string' ? searchParams.limit : '20');
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const subreddit = typeof searchParams.subreddit === 'string' ? searchParams.subreddit : '';
  const businessType = typeof searchParams.businessType === 'string' ? searchParams.businessType : '';
  const platform = typeof searchParams.platform === 'string' ? searchParams.platform : '';
  const targetAudience = typeof searchParams.targetAudience === 'string' ? searchParams.targetAudience : '';
  const industryVertical = typeof searchParams.industryVertical === 'string' ? searchParams.industryVertical : '';
  const niche = typeof searchParams.niche === 'string' ? searchParams.niche : '';
  const minScore = parseFloat(typeof searchParams.minScore === 'string' ? searchParams.minScore : '0');
  const viability = typeof searchParams.viability === 'string' ? searchParams.viability : 'all';
  const sortBy = typeof searchParams.sortBy === 'string' ? searchParams.sortBy : 'overallScore';
  const sortOrder = typeof searchParams.sortOrder === 'string' ? searchParams.sortOrder : 'desc';

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { proposedSolution: { contains: search, mode: 'insensitive' } },
      { businessType: { contains: search, mode: 'insensitive' } },
      { niche: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (subreddit) {
    where.subreddit = subreddit;
  }

  if (businessType) {
    where.businessType = businessType;
  }

  if (platform) {
    where.platform = platform;
  }

  if (targetAudience) {
    where.targetAudience = targetAudience;
  }

  if (industryVertical) {
    where.industryVertical = industryVertical;
  }

  if (niche) {
    where.niche = niche;
  }

  if (minScore > 0) {
    where.overallScore = { gte: minScore };
  }

  if (viability === 'viable') {
    where.viabilityThreshold = true;
  } else if (viability === 'not_viable') {
    where.viabilityThreshold = false;
  }

  // Build orderBy clause
  const orderBy: Record<string, string> = {};
  orderBy[sortBy] = sortOrder;

  // Fetch opportunities with related data
  const [opportunities, totalCount] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: {
        redditPosts: {
          select: {
            id: true,
            sourceType: true,
            confidence: true,
            redditPost: {
              select: {
                id: true,
                title: true,
                author: true,
                score: true,
                upvotes: true,
                downvotes: true,
                numComments: true,
                permalink: true,
                subreddit: true,
                createdUtc: true,
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.opportunity.count({ where }),
  ]);

  // Get summary statistics
  const stats = await Promise.all([
    prisma.opportunity.count(),
    prisma.opportunity.count({ where: { viabilityThreshold: true } }),
    prisma.opportunity.aggregate({ _avg: { overallScore: true } }),
  ]);

  const [totalOpportunities, viableOpportunities, avgScoreResult] = stats;

  // Get available filter options
  const filterOptions = await Promise.all([
    prisma.opportunity.groupBy({ by: ['subreddit'], _count: { subreddit: true }, orderBy: { _count: { subreddit: 'desc' } } }),
    prisma.opportunity.groupBy({ by: ['businessType'], _count: { businessType: true }, where: { businessType: { not: null } }, orderBy: { _count: { businessType: 'desc' } } }),
    prisma.opportunity.groupBy({ by: ['platform'], _count: { platform: true }, where: { platform: { not: null } }, orderBy: { _count: { platform: 'desc' } } }),
    prisma.opportunity.groupBy({ by: ['targetAudience'], _count: { targetAudience: true }, where: { targetAudience: { not: null } }, orderBy: { _count: { targetAudience: 'desc' } } }),
    prisma.opportunity.groupBy({ by: ['industryVertical'], _count: { industryVertical: true }, where: { industryVertical: { not: null } }, orderBy: { _count: { industryVertical: 'desc' } } }),
    prisma.opportunity.groupBy({ by: ['niche'], _count: { niche: true }, where: { niche: { not: null } }, orderBy: { _count: { niche: 'desc' } } }),
  ]);

  const [subreddits, businessTypes, platforms, targetAudiences, industryVerticals, niches] = filterOptions;

  return {
    opportunities,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount,
    },
    stats: {
      total: totalOpportunities,
      viable: viableOpportunities,
      avgScore: avgScoreResult._avg.overallScore || 0,
    },
    filters: {
      subreddits: subreddits.map(s => s.subreddit),
      businessTypes: businessTypes.map(b => b.businessType!),
      platforms: platforms.map(p => p.platform!),
      targetAudiences: targetAudiences.map(t => t.targetAudience!),
      industryVerticals: industryVerticals.map(i => i.industryVertical!),
      niches: niches.map(n => n.niche!),
    },
  };
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  try {
    const resolvedSearchParams = await searchParams;
    const data = await getOpportunitiesData(resolvedSearchParams);
    
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading opportunities...</p>
            </div>
          </div>
        }
      >
        <OpportunitiesPageContent 
          initialData={data} 
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading opportunities:', error);
    notFound();
  }
}

// Add metadata for SEO
export async function generateMetadata({ searchParams }: OpportunitiesPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : '';
  const subreddit = typeof resolvedSearchParams.subreddit === 'string' ? resolvedSearchParams.subreddit : '';
  const businessType = typeof resolvedSearchParams.businessType === 'string' ? resolvedSearchParams.businessType : '';
  
  let title = 'AI Business Opportunities';
  let description = 'Discover AI-powered business opportunities identified from Reddit communities';
  
  if (search) {
    title = `AI Opportunities: "${search}"`;
    description = `Search results for "${search}" in AI business opportunities`;
  } else if (subreddit) {
    title = `AI Opportunities from r/${subreddit}`;
    description = `Business opportunities discovered from r/${subreddit} community`;
  } else if (businessType) {
    title = `${businessType} Business Opportunities`;
    description = `${businessType} business opportunities identified through AI analysis`;
  }
  
  return {
    title,
    description,
  };
}