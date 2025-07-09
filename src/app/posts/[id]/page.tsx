import { notFound } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { PostDetailContent } from '../../../components/PostDetailContent';

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const resolvedParams = await params;
  const post = await prisma.redditPost.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      redditId: true,
      title: true,
      content: true,
      author: true,
      subreddit: true,
      score: true,
      upvotes: true,
      downvotes: true,
      numComments: true,
      permalink: true,
      url: true,
      createdUtc: true,
      processedAt: true,
      processingError: true,
      isOpportunity: true,
      rejectionReasons: true,
      aiConfidence: true,
      aiAnalysisDate: true,
      commentAnalysisStatus: true,
      commentAnalysisJobId: true,
      commentAnalysisStarted: true,
      commentAnalysisCompleted: true,
      commentAnalysisError: true,
      commentOpportunitiesFound: true,
      createdAt: true,
      updatedAt: true,
      opportunitySources: {
        select: {
          id: true,
          confidence: true,
          sourceType: true,
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

  return <PostDetailContent post={post} />;
}