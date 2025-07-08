import { OpportunityCard } from '../../components/OpportunityCard';
import { OpportunityFilters } from '../../components/OpportunityFilters';
import { prisma } from '../../lib/prisma';

interface SearchParams {
  search?: string;
  subreddit?: string;
  minScore?: string;
  sortBy?: 'score' | 'date' | 'subreddit';
  sortOrder?: 'asc' | 'desc';
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const {
    search = '',
    subreddit = '',
    minScore = '0',
    sortBy = 'score',
    sortOrder = 'desc',
  } = searchParams;

  // Build where clause for filtering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { proposedSolution: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (subreddit) {
    whereClause.subreddit = subreddit;
  }

  if (minScore && parseFloat(minScore) > 0) {
    whereClause.overallScore = { gte: parseFloat(minScore) };
  }

  // Build order clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderClause: any = {};
  if (sortBy === 'score') {
    orderClause.overallScore = sortOrder;
  } else if (sortBy === 'date') {
    orderClause.createdAt = sortOrder;
  } else if (sortBy === 'subreddit') {
    orderClause.subreddit = sortOrder;
  }

  const opportunities = await prisma.opportunity.findMany({
    where: whereClause,
    include: {
      redditPost: true,
    },
    orderBy: orderClause,
  });

  const viableOpportunities = opportunities.filter(opp => opp.viabilityThreshold);
  const totalOpportunities = opportunities.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🎯 AI Opportunities Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Discover validated business opportunities from Reddit discussions
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {search || subreddit || minScore !== '0' ? 'Filtered' : 'Total Found'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalOpportunities}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Viable (4+ Score)</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{viableOpportunities.length}</div>
            </div>
          </div>
        </div>

        <OpportunityFilters 
          initialSearch={search}
          initialSubreddit={subreddit}
          initialMinScore={parseFloat(minScore)}
          initialSortBy={sortBy}
          initialSortOrder={sortOrder}
        />

        <div className="grid gap-6 mt-8">
          {opportunities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 text-lg">
                {search || subreddit || minScore !== '0' ? 
                  'No opportunities match your filters. Try adjusting your search criteria.' :
                  'No opportunities found yet. Try running the Reddit scraping to discover opportunities!'
                }
              </div>
              {(search || subreddit || minScore !== '0') && (
                <a
                  href="/opportunities"
                  className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Clear All Filters
                </a>
              )}
            </div>
          ) : (
            <>
              {(search || subreddit || minScore !== '0') && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      Showing {opportunities.length} opportunities
                      {search && ` matching "${search}"`}
                      {subreddit && ` from r/${subreddit}`}
                      {minScore !== '0' && ` with score ≥ ${minScore}`}
                    </div>
                    <a
                      href="/opportunities"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Clear filters
                    </a>
                  </div>
                </div>
              )}
              
              {opportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}