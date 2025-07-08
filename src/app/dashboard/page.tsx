import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { TriggerScrapingButton } from '../../components/TriggerScrapingButton';
import { prisma } from '../../lib/prisma';

export default async function Dashboard() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/auth/signin');
  }

  // Get some stats
  const stats = await Promise.all([
    prisma.redditPost.count(),
    prisma.opportunity.count(),
    prisma.opportunity.count({ where: { viabilityThreshold: true } }),
    prisma.redditPost.count({ where: { processedAt: { not: null } } }),
  ]);

  const [totalPosts, totalOpportunities, viableOpportunities, processedPosts] = stats;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🎯 Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage Reddit scraping and opportunity discovery
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              📄 Total Posts
            </h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {totalPosts}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              🔍 Processed Posts
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {processedPosts}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              💡 Opportunities
            </h3>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totalOpportunities}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              ✅ Viable (4+ Score)
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {viableOpportunities}
            </p>
          </div>
        </div>

        {/* Manual Controls */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            🚀 Manual Controls
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Trigger immediate Reddit scraping and AI analysis. The system also runs automatically on schedule.
          </p>
          <div className="flex gap-4">
            <TriggerScrapingButton />
            <a
              href="/opportunities"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🎯 View Opportunities
            </a>
          </div>
        </div>

        {/* Scheduling Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            ⏰ Automated Scheduling
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                🔥 Peak Activity (9 AM - 1 PM EST)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Every 30 minutes • High-engagement content • 50 posts/subreddit
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                📊 Daily Comprehensive (2 PM EST)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Once daily • All subreddits • 100 posts/subreddit
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                ⚡ Real-time Hot Content
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Every 10 minutes • Hot posts • 25 posts/subreddit
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                🎯 Weekend Discovery (Saturday)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Weekly • Side hustle focus • 75 posts/subreddit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}