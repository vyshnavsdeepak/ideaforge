import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { prisma } from '@/shared/services/prisma';
import { Badge } from '../../../components/ui/Badge';
import { Delta4Radar } from '../../../components/Delta4Radar';
import { ExternalLink, Clock, MessageSquare, ArrowBigUp, ArrowLeft } from 'lucide-react';
import { formatRedditUrl } from '@/reddit';

interface OpportunityPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: OpportunityPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: resolvedParams.id },
    select: {
      title: true,
      description: true,
    },
  });

  if (!opportunity) {
    return {
      title: 'Opportunity Not Found',
    };
  }

  return {
    title: `${opportunity.title} | Opportunities`,
    description: opportunity.description,
  };
}

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  const resolvedParams = await params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: resolvedParams.id },
    include: {
      redditPosts: {
        include: {
          redditPost: {
            include: {
              opportunitySources: {
                include: {
                  opportunity: {
                    select: {
                      id: true,
                      title: true,
                      overallScore: true,
                      viabilityThreshold: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!opportunity) {
    notFound();
  }

  const delta4Scores = {
    speed: opportunity.speedScore,
    convenience: opportunity.convenienceScore,
    trust: opportunity.trustScore,
    price: opportunity.priceScore,
    status: opportunity.statusScore,
    predictability: opportunity.predictabilityScore,
    uiUx: opportunity.uiUxScore,
    easeOfUse: opportunity.easeOfUseScore,
    legalFriction: opportunity.legalFrictionScore,
    emotionalComfort: opportunity.emotionalComfortScore,
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600 dark:text-green-400';
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 7) return 'bg-green-50 dark:bg-green-900/20';
    if (score >= 5) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Back Link */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/opportunities"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Opportunities
          </Link>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Opportunity Details
          </h1>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Opportunity Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {opportunity.title}
                  </h2>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant={opportunity.viabilityThreshold ? "success" : "warning"}>
                      {opportunity.viabilityThreshold ? "✅ Viable" : "⚠️ Below Threshold"} 
                      ({opportunity.overallScore.toFixed(1)})
                    </Badge>
                    <Badge variant="outline">r/{opportunity.subreddit}</Badge>
                    <Badge variant="outline">{opportunity.redditPosts.length} source{opportunity.redditPosts.length > 1 ? 's' : ''}</Badge>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                    {opportunity.description}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Market Size</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{opportunity.marketSize || 'Unknown'}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Complexity</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{opportunity.complexity || 'Medium'}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Success Probability</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{opportunity.successProbability || 'Medium'}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Created</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{formatDate(opportunity.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Solutions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💡 Proposed Solution
              </h3>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {opportunity.proposedSolution}
                </p>
              </div>

              {opportunity.currentSolution && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                    🔧 Current Solution
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {opportunity.currentSolution}
                  </p>
                </div>
              )}

              {opportunity.marketContext && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                    🌍 Market Context
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {opportunity.marketContext}
                  </p>
                </div>
              )}

              {opportunity.implementationNotes && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                    📋 Implementation Notes
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {opportunity.implementationNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Business Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🏢 Business Categories
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Business Type:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.businessType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Business Model:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.businessModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue Model:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.revenueModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Platform:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Target Audience:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.targetAudience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Industry:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.industryVertical}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Niche:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.niche}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Size:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.teamSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Capital Required:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.capitalRequirement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Development Time:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.developmentTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Competition:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.competitionLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Growth Potential:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{opportunity.growthPotential}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Reddit Posts */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📝 Source Reddit Posts ({opportunity.redditPosts.length})
              </h3>
              <div className="space-y-4">
                {opportunity.redditPosts.map((source, index) => (
                  <div key={source.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{index + 1}</span>
                          <Badge variant="outline" className="text-xs">r/{source.redditPost.subreddit}</Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">by u/{source.redditPost.author}</span>
                          {source.confidence >= 0.95 && (
                            <Badge variant="success" className="text-xs">High confidence</Badge>
                          )}
                        </div>
                        <Link
                          href={`/posts/${source.redditPost.id}`}
                          className="text-lg font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {source.redditPost.title}
                        </Link>
                        {source.redditPost.content && (
                          <p className="text-gray-700 dark:text-gray-300 text-sm mt-2 line-clamp-3">
                            {source.redditPost.content}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <ArrowBigUp className="w-4 h-4 text-orange-500" />
                          <span>{source.redditPost.score}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>{source.redditPost.numComments} comments</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(source.redditPost.createdUtc)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/posts/${source.redditPost.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          📝 View Details
                        </Link>
                        {source.redditPost.permalink && (
                          <a
                            href={formatRedditUrl(source.redditPost.permalink) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Reddit
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Related Opportunities from same post */}
                    {source.redditPost.opportunitySources.length > 1 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Other opportunities from this post:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {source.redditPost.opportunitySources
                            .filter(opp => opp.opportunity.id !== opportunity.id)
                            .map(opp => (
                              <Link
                                key={opp.opportunity.id}
                                href={`/opportunities/${opp.opportunity.id}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                              >
                                {opp.opportunity.title}
                                {opp.opportunity.viabilityThreshold && (
                                  <span className="text-green-600 dark:text-green-400">✅</span>
                                )}
                              </Link>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Delta 4 Analysis */}
          <div className="space-y-6">
            {/* Delta 4 Radar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📊 Delta 4 Analysis
              </h3>
              <div className="flex justify-center mb-6">
                <Delta4Radar scores={delta4Scores} size={200} />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {opportunity.overallScore.toFixed(1)}/10
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Overall Score
                </div>
              </div>
            </div>

            {/* Detailed Scores */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🔍 Detailed Scores
              </h3>
              <div className="space-y-3">
                {Object.entries(delta4Scores).map(([key, score]) => (
                  <div key={key} className={`p-3 rounded-lg ${getScoreBackground(score)}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {key === 'uiUx' ? 'UI/UX' : key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                        {score}/10
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${score * 10}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ⚡ Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href="/opportunities"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  📋 View All Opportunities
                </Link>
                <Link
                  href={`/opportunities?subreddit=${opportunity.subreddit}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  🎯 r/{opportunity.subreddit} Opportunities
                </Link>
                <Link
                  href={`/posts?subreddit=${opportunity.subreddit}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  📝 r/{opportunity.subreddit} Posts
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}