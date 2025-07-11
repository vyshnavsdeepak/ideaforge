import { Metadata } from 'next';
import { OpportunitiesPageSSR } from '../../components/OpportunitiesPageSSR';
import { createServerCaller } from '@/trpc/server';

export const metadata: Metadata = {
  title: 'Opportunities',
  description: 'Discover AI-identified business opportunities from Reddit',
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    subreddit?: string;
    businessType?: string;
    platform?: string;
    targetAudience?: string;
    industryVertical?: string;
    niche?: string;
    minScore?: string;
    viability?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  // Await the searchParams promise
  const params = await searchParams;
  
  // Convert searchParams to the format expected by tRPC
  const filters = {
    page: parseInt(params.page || '1'),
    limit: parseInt(params.limit || '20'),
    search: params.search,
    subreddit: params.subreddit,
    businessType: params.businessType,
    platform: params.platform,
    targetAudience: params.targetAudience,
    industryVertical: params.industryVertical,
    niche: params.niche,
    minScore: params.minScore ? parseFloat(params.minScore) : undefined,
    viability: params.viability as 'all' | 'viable' | 'not_viable' | undefined,
    sortBy: params.sortBy as 'overallScore' | 'createdAt' | 'title' | 'subreddit' | 'businessType' | 'deltaScore' | undefined,
    sortOrder: params.sortOrder as 'asc' | 'desc' | undefined,
  };

  // Fetch data server-side using tRPC
  const caller = await createServerCaller();
  const data = await caller.opportunities.list(filters);

  return <OpportunitiesPageSSR data={data} searchParams={params} />;
}