export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🎯 Reddit AI Opportunity Finder
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover validated AI business opportunities by analyzing Reddit discussions using Kunal Shah&apos;s Delta 4 theory
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              🔍 Auto Discovery
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Continuously scrapes 15+ professional subreddits for business problems
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              🤖 AI Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              GPT-4 powered Delta 4 scoring across 10 business dimensions
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              📊 Smart Filtering
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Only shows opportunities with 4+ delta improvement potential
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Quick Start
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Access the admin dashboard to manage scraping and view discovered opportunities:
          </p>
          <div className="flex gap-4">
            <a
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔐 Admin Dashboard
            </a>
            <a
              href="/opportunities"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🎯 View Opportunities
            </a>
            <a
              href="/market-demand"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              📊 Market Demand
            </a>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            System Status
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">Database</span>
              <span className="text-green-600 dark:text-green-400">●</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">Inngest</span>
              <span className="text-green-600 dark:text-green-400">●</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">Reddit API</span>
              <span className="text-green-600 dark:text-green-400">●</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="text-gray-700 dark:text-gray-300">Gemini AI</span>
              <span className="text-green-600 dark:text-green-400">●</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
