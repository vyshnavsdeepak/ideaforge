import { Badge } from './ui/Badge';
import { Delta4Radar } from './Delta4Radar';
import { ExternalLink, TrendingUp, Users, Clock, Target } from 'lucide-react';
import { formatRedditUrl } from '../lib/reddit-utils';

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
    redditPosts?: Array<{
      id: string;
      sourceType: string;
      confidence: number;
      redditPost: {
        id: string;
        title: string;
        author: string;
        score: number;
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {opportunity.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            {opportunity.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getViabilityBadge()}
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

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
                <Delta4Radar scores={delta4Scores} size={180} />
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
                <Badge variant="success" size="sm">
                  Multi-source validated
                </Badge>
              )}
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {opportunity.redditPosts.map((source, index) => (
                <div key={source.id} className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-mono">#{index + 1}</span>
                    <span className="truncate">r/{source.redditPost.subreddit}</span>
                    <span className="truncate flex-1">{source.redditPost.title.substring(0, 40)}...</span>
                    <span>u/{source.redditPost.author}</span>
                    <span>↑ {source.redditPost.score}</span>
                  </div>
                  {source.redditPost.permalink && (
                    <a
                      href={formatRedditUrl(source.redditPost.permalink) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline ml-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : opportunity.redditPost ? (
          // Fallback for old single-source structure
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>From: {opportunity.redditPost.title.substring(0, 50)}...</span>
              <span>by u/{opportunity.redditPost.author}</span>
              <span>↑ {opportunity.redditPost.score}</span>
              <span>💬 {opportunity.redditPost.numComments}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{new Date(opportunity.createdAt).toLocaleDateString()}</span>
              {opportunity.redditPost.permalink && (
                <a
                  href={formatRedditUrl(opportunity.redditPost.permalink) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
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