import { OpportunityCard } from '../../components/OpportunityCard';
import { OpportunityFilters } from '../../components/OpportunityFilters';
import { prisma } from '../../lib/prisma';

export default async function OpportunitiesPage() {
  const opportunities = await prisma.opportunity.findMany({
    include: {
      redditPost: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
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
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Found</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalOpportunities}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Viable (4+ Score)</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{viableOpportunities.length}</div>
            </div>
          </div>
        </div>

        <OpportunityFilters />

        <div className="grid gap-6 mt-8">
          {opportunities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 text-lg">
                No opportunities found yet. Try running the Reddit scraping to discover opportunities!
              </div>
            </div>
          ) : (
            opportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}