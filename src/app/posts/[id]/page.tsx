import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '../../../lib/prisma';
import { Badge } from '../../../components/ui/Badge';
import { ExternalLink, MessageSquare, ArrowBigUp, ArrowBigDown, ArrowLeft, User, Calendar, Hash, AlertTriangle } from 'lucide-react';
import { formatRedditUrl } from '../../../lib/reddit-utils';

interface PostPageProps {
  params: {
    id: string;
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await prisma.redditPost.findUnique({
    where: { id: params.id },
    include: {
      opportunitySources: {
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
              description: true,
              overallScore: true,
              viabilityThreshold: true,
              createdAt: true,
              businessType: true,
              industryVertical: true,
              niche: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProcessingStatus = () => {
    if (post.processingError) {
      return { status: 'failed', label: 'Failed', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' };
    }
    if (post.processedAt) {
      return { status: 'processed', label: 'Processed', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' };
    }
    // Check if post was recently scraped but not yet processed
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (post.createdAt > fiveMinutesAgo && !post.processedAt) {
      return { status: 'processing', label: 'Processing', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' };
    }
    return { status: 'unprocessed', label: 'Unprocessed', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' };
  };

  const processingStatus = getProcessingStatus();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Back Link */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/posts"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reddit Posts
          </Link>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reddit Post Details
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline">r/{post.subreddit}</Badge>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${processingStatus.bgColor} ${processingStatus.color}`}>
                      {processingStatus.label}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>u/{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(post.createdUtc)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      <span>{post.redditId}</span>
                    </div>
                  </div>
                </div>
                {post.permalink && (
                  <a
                    href={formatRedditUrl(post.permalink) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Reddit
                  </a>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📝 Post Content
              </h3>
              {post.content ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 italic">
                  No content available (this might be a link post)
                </div>
              )}
            </div>

            {/* Processing Status Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ⚙️ Processing Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</div>
                    <div className={`text-sm font-semibold ${processingStatus.color}`}>
                      {processingStatus.label}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Scraped At</div>
                    <div className="text-sm text-gray-900 dark:text-white">{formatDate(post.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Processed At</div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {post.processedAt ? formatDate(post.processedAt) : 'Not processed yet'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Opportunities Generated</div>
                    <div className="text-sm text-gray-900 dark:text-white">{post.opportunitySources.length}</div>
                  </div>
                </div>

                {post.processingError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-red-800 dark:text-red-200">Processing Error</div>
                        <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {post.processingError}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Opportunities */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🎯 Generated Opportunities ({post.opportunitySources.length})
              </h3>
              {post.opportunitySources.length > 0 ? (
                <div className="space-y-4">
                  {post.opportunitySources.map((source) => (
                    <div key={source.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={source.opportunity.viabilityThreshold ? "success" : "warning"}>
                              {source.opportunity.viabilityThreshold ? "✅ Viable" : "⚠️ Below Threshold"}
                            </Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Score: {source.opportunity.overallScore.toFixed(1)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Confidence: {(source.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Link
                            href={`/opportunities/${source.opportunity.id}`}
                            className="text-lg font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {source.opportunity.title}
                          </Link>
                          <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">
                            {source.opportunity.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Type: {source.opportunity.businessType}</span>
                          <span>Industry: {source.opportunity.industryVertical}</span>
                          <span>Niche: {source.opportunity.niche}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/opportunities/${source.opportunity.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            📋 View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {processingStatus.status === 'failed' ? (
                    <div>
                      <div className="text-lg mb-2">❌ Processing Failed</div>
                      <div className="text-sm">This post could not be processed due to an error.</div>
                    </div>
                  ) : processingStatus.status === 'unprocessed' ? (
                    <div>
                      <div className="text-lg mb-2">⏳ Awaiting Processing</div>
                      <div className="text-sm">This post has not been analyzed yet.</div>
                    </div>
                  ) : processingStatus.status === 'processing' ? (
                    <div>
                      <div className="text-lg mb-2">🔄 Processing in Progress</div>
                      <div className="text-sm">AI analysis is currently running for this post.</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg mb-2">🔍 No Opportunities Found</div>
                      <div className="text-sm">This post was processed but no viable opportunities were identified.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Metadata & Actions */}
          <div className="space-y-6">
            {/* Post Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📊 Post Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowBigUp className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Score</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{post.score}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowBigUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Upvotes</span>
                  </div>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">{post.upvotes}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowBigDown className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Downvotes</span>
                  </div>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">{post.downvotes}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Comments</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{post.numComments}</span>
                </div>
              </div>
            </div>

            {/* Post Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ℹ️ Post Information
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Subreddit</div>
                  <div className="text-sm text-gray-900 dark:text-white">r/{post.subreddit}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Author</div>
                  <div className="text-sm text-gray-900 dark:text-white">u/{post.author}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Reddit ID</div>
                  <div className="text-sm text-gray-900 dark:text-white font-mono">{post.redditId}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Posted</div>
                  <div className="text-sm text-gray-900 dark:text-white">{formatDate(post.createdUtc)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Scraped</div>
                  <div className="text-sm text-gray-900 dark:text-white">{formatDate(post.createdAt)}</div>
                </div>
                {post.url && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">URL</div>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {post.url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ⚡ Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href="/posts"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  📝 View All Posts
                </Link>
                <Link
                  href={`/posts?subreddit=${post.subreddit}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  🎯 r/{post.subreddit} Posts
                </Link>
                <Link
                  href={`/posts?author=${post.author}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  👤 u/{post.author} Posts
                </Link>
                {post.opportunitySources.length > 0 && (
                  <Link
                    href={`/opportunities?subreddit=${post.subreddit}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/40"
                  >
                    💡 Related Opportunities
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}