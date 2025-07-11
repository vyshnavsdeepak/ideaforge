import Link from 'next/link';
import { Badge } from './ui/Badge';
import { Delta4Radar } from './Delta4Radar';
import { TRPCBookmarkButton } from './Bookmarks/TRPCBookmarkButton';
import { ExternalLink, TrendingUp, Users, Clock, Target, MessageSquare, ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { formatRedditUrl } from '@/reddit';

interface MakeshiftSolution {
  description: string;
  currentApproach: string;
  painPoints: string[];
  timeInvestment: string;
  costEstimate: string;
  skillsRequired: string[];
  frustrationLevel: 'Low' | 'Medium' | 'High';
  scalabilityIssues: string[];
}

interface SoftwareSolution {
  description: string;
  proposedApproach: string;
  keyFeatures: string[];
  automationLevel: 'Partial' | 'High' | 'Full';
  userExperience: string;
  integrationCapabilities: string[];
  maintenanceRequirements: string;
}

interface DeltaComparison {
  makeshiftDelta4: {
    speed: number;
    convenience: number;
    trust: number;
    price: number;
    status: number;
    predictability: number;
    uiUx: number;
    easeOfUse: number;
    legalFriction: number;
    emotionalComfort: number;
  };
  softwareDelta4: {
    speed: number;
    convenience: number;
    trust: number;
    price: number;
    status: number;
    predictability: number;
    uiUx: number;
    easeOfUse: number;
    legalFriction: number;
    emotionalComfort: number;
  };
  improvementDelta: {
    speed: number;
    convenience: number;
    trust: number;
    price: number;
    status: number;
    predictability: number;
    uiUx: number;
    easeOfUse: number;
    legalFriction: number;
    emotionalComfort: number;
  };
  totalDeltaScore: number;
  biggestImprovements: string[];
  reasonsForSoftware: string[];
}

interface OpportunityCardProps {
  opportunity: {
    id: string;
    title: string;
    description: string;
    currentSolution?: string | null;
    proposedSolution: string;
    marketContext?: string | null;
    implementationNotes?: string | null;
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
    createdAt: Date;
    sourceCount?: number;
    niche?: string | null;
    makeshiftSolution?: MakeshiftSolution | null;
    softwareSolution?: SoftwareSolution | null;
    deltaComparison?: DeltaComparison | null;
    redditPosts?: Array<{
      id: string;
      sourceType: string;
      confidence: number;
      redditPost: {
        id: string;
        title: string;
        author: string;
        score: number;
        upvotes?: number;
        downvotes?: number;
        numComments: number;
        permalink: string | null;
        subreddit: string;
        createdUtc: Date;
      };
    }>;
    // Keep old structure for backward compatibility
    redditPost?: {
      title: string;
      author: string;
      score: number;
      numComments: number;
      permalink: string | null;
    };
  };
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
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

  const getViabilityBadge = () => {
    if (opportunity.viabilityThreshold) {
      return <Badge variant="success">✅ Viable ({opportunity.overallScore.toFixed(1)})</Badge>;
    }
    return <Badge variant="warning">⚠️ Below Threshold ({opportunity.overallScore.toFixed(1)})</Badge>;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
        <div className="flex-1 sm:mr-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
            <Link href={`/opportunities/${opportunity.id}`}>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                {opportunity.title}
              </h3>
            </Link>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {opportunity.redditPosts?.length || 1} source{(opportunity.redditPosts?.length || 1) > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3">
            {opportunity.description}
          </p>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
          <div className="flex items-center gap-2">
            <TRPCBookmarkButton 
              opportunityId={opportunity.id} 
              size="sm"
              showText={false}
              variant="default"
            />
            {getViabilityBadge()}
          </div>
          <Badge variant="outline">r/{opportunity.subreddit}</Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💡 Proposed Solution</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {opportunity.proposedSolution}
            </p>
          </div>

          {opportunity.currentSolution && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🔧 Current Solution</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {opportunity.currentSolution}
              </p>
            </div>
          )}

          {/* Makeshift vs Software Analysis */}
          {opportunity.makeshiftSolution && opportunity.softwareSolution && opportunity.deltaComparison && (
            <div className="space-y-4">
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">⚡ Makeshift vs Software Analysis</h4>
                
                {/* Delta Score Summary */}
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        +{opportunity.deltaComparison.totalDeltaScore.toFixed(1)} Delta Score
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Software improvement over makeshift
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Top improvements:
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {opportunity.deltaComparison.biggestImprovements.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two-column comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Makeshift Solution */}
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-600 dark:text-red-400 font-semibold">🔨 Makeshift</span>
                      <Badge variant="error" className="text-xs">
                        {opportunity.makeshiftSolution.frustrationLevel} Frustration
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {opportunity.makeshiftSolution.description}
                    </p>
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="font-medium">Time:</span> {opportunity.makeshiftSolution.timeInvestment}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Cost:</span> {opportunity.makeshiftSolution.costEstimate}
                      </div>
                      {opportunity.makeshiftSolution.painPoints.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Pain Points:</span>
                          <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-gray-400">
                            {opportunity.makeshiftSolution.painPoints.slice(0, 3).map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Software Solution */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600 dark:text-green-400 font-semibold">💻 Software</span>
                      <Badge variant="success" className="text-xs">
                        {opportunity.softwareSolution.automationLevel} Automation
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {opportunity.softwareSolution.description}
                    </p>
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="font-medium">UX:</span> {opportunity.softwareSolution.userExperience}
                      </div>
                      {opportunity.softwareSolution.keyFeatures.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Key Features:</span>
                          <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-gray-400">
                            {opportunity.softwareSolution.keyFeatures.slice(0, 3).map((feature, i) => (
                              <li key={i}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {opportunity.softwareSolution.integrationCapabilities.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium">Integrations:</span> {opportunity.softwareSolution.integrationCapabilities.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delta Improvements */}
                {opportunity.deltaComparison.reasonsForSoftware.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Why Software Wins:
                    </h5>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      {opportunity.deltaComparison.reasonsForSoftware.slice(0, 3).map((reason, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>Market: {opportunity.marketSize || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>Complexity: {opportunity.complexity || 'Medium'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Success: {opportunity.successProbability || 'Medium'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">📊 Delta 4 Analysis</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex justify-center">
                <Delta4Radar scores={delta4Scores} size={160} />
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Speed:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.speed)}`}>
                    {delta4Scores.speed}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Convenience:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.convenience)}`}>
                    {delta4Scores.convenience}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Trust:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.trust)}`}>
                    {delta4Scores.trust}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.price)}`}>
                    {delta4Scores.price}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.status)}`}>
                    {delta4Scores.status}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Predictability:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.predictability)}`}>
                    {delta4Scores.predictability}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>UI/UX:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.uiUx)}`}>
                    {delta4Scores.uiUx}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ease of Use:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.easeOfUse)}`}>
                    {delta4Scores.easeOfUse}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Legal Friction:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.legalFriction)}`}>
                    {delta4Scores.legalFriction}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Emotional Comfort:</span>
                  <span className={`font-semibold ${getScoreColor(delta4Scores.emotionalComfort)}`}>
                    {delta4Scores.emotionalComfort}/10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {/* Show multiple sources if available */}
        {opportunity.redditPosts && opportunity.redditPosts.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sources ({opportunity.sourceCount || opportunity.redditPosts.length})
              </span>
              {opportunity.sourceCount && opportunity.sourceCount > 1 && (
                <Badge variant="success">
                  Multi-source validated
                </Badge>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {opportunity.redditPosts.map((source, index) => (
                <div key={source.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">#{index + 1}</span>
                        <Badge variant="outline" className="text-xs">r/{source.redditPost.subreddit}</Badge>
                        <span className="text-xs text-gray-500">by u/{source.redditPost.author}</span>
                        {source.confidence >= 0.95 && (
                          <Badge variant="success" className="text-xs">High confidence</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                        {source.redditPost.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <ArrowBigUp className="w-4 h-4 text-orange-500" />
                          <span>{source.redditPost.score}</span>
                        </div>
                        {source.redditPost.upvotes !== undefined && source.redditPost.downvotes !== undefined && (
                          <>
                            <div className="flex items-center gap-1">
                              <ArrowBigUp className="w-3 h-3 text-green-500" />
                              <span>{source.redditPost.upvotes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ArrowBigDown className="w-3 h-3 text-red-500" />
                              <span>{source.redditPost.downvotes}</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>{source.redditPost.numComments} comments</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(source.redditPost.createdUtc).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mt-2 sm:mt-0">
                      <a
                        href={`/posts?search=${encodeURIComponent(source.redditPost.title)}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      >
                        📝 In DB
                      </a>
                      {source.redditPost.permalink && (
                        <a
                          href={formatRedditUrl(source.redditPost.permalink) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Reddit
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : opportunity.redditPost ? (
          // Fallback for old single-source structure
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {opportunity.redditPost.title}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>by u/{opportunity.redditPost.author}</span>
                  <div className="flex items-center gap-1">
                    <ArrowBigUp className="w-4 h-4 text-orange-500" />
                    <span>{opportunity.redditPost.score}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{opportunity.redditPost.numComments} comments</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(opportunity.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {opportunity.redditPost.permalink && (
                <a
                  href={formatRedditUrl(opportunity.redditPost.permalink) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Post
                </a>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}