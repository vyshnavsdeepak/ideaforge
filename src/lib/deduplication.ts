import { prisma } from './prisma';

/**
 * Comprehensive deduplication utilities for Reddit posts and opportunities
 */

export interface DuplicationCheck {
  isDuplicate: boolean;
  existingId?: string;
  similarityScore?: number;
  reason?: string;
}

/**
 * Check if a Reddit post already exists or is similar to existing posts
 */
export async function checkRedditPostDuplication(
  redditId: string,
  title: string,
  content: string,
  subreddit: string,
  author: string
): Promise<DuplicationCheck> {
  // 1. Exact Reddit ID match (current system)
  const exactMatch = await prisma.redditPost.findUnique({
    where: { redditId }
  });
  
  if (exactMatch) {
    return {
      isDuplicate: true,
      existingId: exactMatch.id,
      reason: 'Exact Reddit ID match'
    };
  }

  // 2. Same title and author combination
  const titleAuthorMatch = await prisma.redditPost.findFirst({
    where: {
      title: { equals: title, mode: 'insensitive' },
      author: { equals: author, mode: 'insensitive' }
    }
  });

  if (titleAuthorMatch) {
    return {
      isDuplicate: true,
      existingId: titleAuthorMatch.id,
      reason: 'Same title and author'
    };
  }

  // 3. Very similar titles (fuzzy matching)
  const similarityThreshold = 0.9;
  const similarPosts = await findSimilarPosts(title, content, subreddit, similarityThreshold);
  
  if (similarPosts.length > 0) {
    return {
      isDuplicate: true,
      existingId: similarPosts[0].id,
      similarityScore: similarPosts[0].similarity,
      reason: 'High content similarity'
    };
  }

  return { isDuplicate: false };
}

/**
 * Check if an opportunity already exists or is too similar to existing opportunities
 */
export async function checkOpportunityDuplication(
  title: string,
  description: string,
  proposedSolution: string,
  niche?: string
): Promise<DuplicationCheck> {
  // 1. Exact title match (and same niche if provided)
  const exactTitleMatch = await prisma.opportunity.findFirst({
    where: {
      title: { equals: title, mode: 'insensitive' },
      ...(niche && { niche: { equals: niche, mode: 'insensitive' } })
    }
  });

  if (exactTitleMatch) {
    return {
      isDuplicate: true,
      existingId: exactTitleMatch.id,
      reason: 'Exact title match' + (niche ? ' in same niche' : '')
    };
  }

  // 2. Similar description or solution
  const similarityThreshold = 0.85;
  const similarOpportunities = await findSimilarOpportunities(
    title,
    description,
    proposedSolution,
    similarityThreshold
  );

  if (similarOpportunities.length > 0) {
    return {
      isDuplicate: true,
      existingId: similarOpportunities[0].id,
      similarityScore: similarOpportunities[0].similarity,
      reason: 'High opportunity similarity'
    };
  }

  return { isDuplicate: false };
}

/**
 * Find similar posts using text similarity
 */
async function findSimilarPosts(
  title: string,
  content: string,
  subreddit: string,
  threshold: number
): Promise<Array<{ id: string; similarity: number }>> {
  // Get recent posts from same subreddit for comparison
  const recentPosts = await prisma.redditPost.findMany({
    where: {
      subreddit,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    select: {
      id: true,
      title: true,
      content: true
    },
    take: 100
  });

  const similarPosts: Array<{ id: string; similarity: number }> = [];

  for (const post of recentPosts) {
    const titleSimilarity = calculateTextSimilarity(title, post.title);
    const contentSimilarity = content && post.content ? 
      calculateTextSimilarity(content, post.content) : 0;
    
    const overallSimilarity = Math.max(titleSimilarity, contentSimilarity * 0.8);
    
    if (overallSimilarity >= threshold) {
      similarPosts.push({
        id: post.id,
        similarity: overallSimilarity
      });
    }
  }

  return similarPosts.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find similar opportunities using text similarity
 */
async function findSimilarOpportunities(
  title: string,
  description: string,
  proposedSolution: string,
  threshold: number
): Promise<Array<{ id: string; similarity: number }>> {
  // Get recent opportunities for comparison
  const recentOpportunities = await prisma.opportunity.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Last 60 days
      }
    },
    select: {
      id: true,
      title: true,
      description: true,
      proposedSolution: true
    },
    take: 200
  });

  const similarOpportunities: Array<{ id: string; similarity: number }> = [];

  for (const opportunity of recentOpportunities) {
    const titleSimilarity = calculateTextSimilarity(title, opportunity.title);
    const descriptionSimilarity = calculateTextSimilarity(description, opportunity.description);
    const solutionSimilarity = calculateTextSimilarity(proposedSolution, opportunity.proposedSolution);
    
    const overallSimilarity = Math.max(
      titleSimilarity,
      descriptionSimilarity * 0.8,
      solutionSimilarity * 0.9
    );
    
    if (overallSimilarity >= threshold) {
      similarOpportunities.push({
        id: opportunity.id,
        similarity: overallSimilarity
      });
    }
  }

  return similarOpportunities.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate text similarity using Jaccard similarity with word ngrams
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  
  const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const text1Normalized = normalize(text1);
  const text2Normalized = normalize(text2);
  
  if (text1Normalized === text2Normalized) return 1;
  
  const getWordSet = (text: string) => new Set(text.split(/\s+/));
  const set1 = getWordSet(text1Normalized);
  const set2 = getWordSet(text2Normalized);
  
  const intersection = new Set([...set1].filter(word => set2.has(word)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Update existing Reddit post with new data (score, comments, etc.)
 */
export async function updateRedditPost(
  redditId: string,
  updates: {
    score?: number;
    upvotes?: number;
    downvotes?: number;
    numComments?: number;
  }
): Promise<void> {
  await prisma.redditPost.update({
    where: { redditId },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  });
}

/**
 * Clean up old duplicate posts (utility function)
 */
export async function cleanupDuplicatePosts(): Promise<{
  deletedPosts: number;
  deletedOpportunities: number;
}> {
  // Find posts with same title and author
  const duplicateGroups = await prisma.redditPost.groupBy({
    by: ['title', 'author'],
    having: {
      title: {
        _count: {
          gt: 1
        }
      }
    },
    _count: {
      id: true
    }
  });

  let deletedPosts = 0;
  let deletedOpportunities = 0;

  for (const group of duplicateGroups) {
    const posts = await prisma.redditPost.findMany({
      where: {
        title: group.title,
        author: group.author
      },
      include: {
        opportunitySources: {
          include: {
            opportunity: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Keep the first post, delete the rest
    const postsToDelete = posts.slice(1);
    
    for (const post of postsToDelete) {
      // Delete all opportunities linked to this post
      for (const oppSource of post.opportunitySources) {
        // First delete the source links
        await prisma.opportunitySource.deleteMany({
          where: { opportunityId: oppSource.opportunity.id }
        });
        
        // Then delete the opportunity
        await prisma.opportunity.delete({
          where: { id: oppSource.opportunity.id }
        });
        deletedOpportunities++;
      }
      
      await prisma.redditPost.delete({
        where: { id: post.id }
      });
      deletedPosts++;
    }
  }

  return { deletedPosts, deletedOpportunities };
}

/**
 * Get deduplication statistics
 */
export async function getDeduplicationStats(): Promise<{
  totalPosts: number;
  totalOpportunities: number;
  postsWithOpportunities: number;
  averagePostsPerSubreddit: number;
  duplicatePostsFound: number;
}> {
  const totalPosts = await prisma.redditPost.count();
  const totalOpportunities = await prisma.opportunity.count();
  const postsWithOpportunities = await prisma.opportunitySource.count();

  const subredditStats = await prisma.redditPost.groupBy({
    by: ['subreddit'],
    _count: {
      id: true
    }
  });

  const averagePostsPerSubreddit = subredditStats.length > 0 
    ? totalPosts / subredditStats.length 
    : 0;

  // Find potential duplicates (same title and author)
  const duplicateGroups = await prisma.redditPost.groupBy({
    by: ['title', 'author'],
    having: {
      title: {
        _count: {
          gt: 1
        }
      }
    },
    _count: {
      id: true
    }
  });

  const duplicatePostsFound = duplicateGroups.reduce((sum, group) => sum + group._count.id - 1, 0);

  return {
    totalPosts,
    totalOpportunities,
    postsWithOpportunities,
    averagePostsPerSubreddit: Math.round(averagePostsPerSubreddit),
    duplicatePostsFound
  };
}