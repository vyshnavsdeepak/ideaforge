import { prisma } from '@/shared';
import { createRedditClient } from './reddit-client';
import type { RedditComment } from './reddit-client';

export interface StoredComment {
  id: string;
  redditId: string;
  body: string;
  author: string;
  score: number;
  createdUtc: Date;
  parentId: string | null;
  isTopLevel: boolean;
  depth: number;
  permalink: string | null;
}

export class CommentStorageService {
  
  /**
   * Fetch comments from Reddit and store them in the database
   */
  static async fetchAndStoreComments(postId: string, permalink: string): Promise<{
    success: boolean;
    commentsStored: number;
    commentsSkipped: number;
    error?: string;
  }> {
    try {
      console.log(`[COMMENT_STORAGE] Starting comment fetch for post ${postId}`);
      
      // Check if post exists
      const post = await prisma.redditPost.findUnique({
        where: { id: postId },
        select: { id: true, redditId: true, subreddit: true }
      });
      
      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }
      
      // Fetch comments from Reddit
      const redditClient = createRedditClient();
      const redditComments = await redditClient.fetchPostComments(permalink);
      
      console.log(`[COMMENT_STORAGE] Fetched ${redditComments.length} comments from Reddit`);
      
      if (redditComments.length === 0) {
        return {
          success: true,
          commentsStored: 0,
          commentsSkipped: 0
        };
      }
      
      // Process and store comments
      let stored = 0;
      let skipped = 0;
      
      for (const comment of redditComments) {
        try {
          // Check if comment already exists
          const existingComment = await prisma.redditPostComment.findUnique({
            where: { redditId: comment.id }
          });
          
          if (existingComment) {
            // Update existing comment (score might have changed)
            await prisma.redditPostComment.update({
              where: { redditId: comment.id },
              data: {
                score: comment.score,
                updatedAt: new Date()
              }
            });
            skipped++;
            continue;
          }
          
          // Determine comment depth and if it's top-level
          const isTopLevel = !comment.parent_id || comment.parent_id.startsWith('t3_');
          const depth = this.calculateCommentDepth(comment, redditComments);
          
          // Store new comment
          await prisma.redditPostComment.create({
            data: {
              postId: post.id,
              redditId: comment.id,
              body: comment.body,
              author: comment.author,
              score: comment.score,
              createdUtc: new Date(comment.created_utc * 1000),
              subreddit: post.subreddit,
              parentId: comment.parent_id,
              isTopLevel,
              depth,
              permalink: comment.parent_id ? null : `/r/${post.subreddit}/comments/${post.redditId}/_/${comment.id}/`,
              rawData: comment
            }
          });
          
          stored++;
          
        } catch (commentError) {
          console.error(`[COMMENT_STORAGE] Error storing comment ${comment.id}:`, commentError);
          skipped++;
        }
      }
      
      // Update post with comment fetch metadata
      await prisma.redditPost.update({
        where: { id: postId },
        data: {
          numComments: redditComments.length,
          updatedAt: new Date()
        }
      });
      
      console.log(`[COMMENT_STORAGE] Stored ${stored} comments, skipped ${skipped}`);
      
      return {
        success: true,
        commentsStored: stored,
        commentsSkipped: skipped
      };
      
    } catch (error) {
      console.error(`[COMMENT_STORAGE] Error fetching/storing comments:`, error);
      return {
        success: false,
        commentsStored: 0,
        commentsSkipped: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get stored comments for a post
   */
  static async getPostComments(postId: string): Promise<StoredComment[]> {
    const comments = await prisma.redditPostComment.findMany({
      where: { postId },
      orderBy: [
        { isTopLevel: 'desc' },
        { score: 'desc' },
        { createdUtc: 'asc' }
      ],
      select: {
        id: true,
        redditId: true,
        body: true,
        author: true,
        score: true,
        createdUtc: true,
        parentId: true,
        isTopLevel: true,
        depth: true,
        permalink: true
      }
    });
    
    return comments;
  }
  
  /**
   * Calculate comment depth in thread hierarchy
   */
  private static calculateCommentDepth(comment: RedditComment, allComments: RedditComment[]): number {
    if (!comment.parent_id || comment.parent_id.startsWith('t3_')) {
      return 0; // Top-level comment
    }
    
    // Find parent comment and calculate depth recursively
    const parentId = comment.parent_id.replace('t1_', '');
    const parentComment = allComments.find(c => c.id === parentId);
    
    if (!parentComment) {
      return 1; // Unknown parent, assume depth 1
    }
    
    return this.calculateCommentDepth(parentComment, allComments) + 1;
  }
  
  /**
   * Get comment count for a post
   */
  static async getCommentCount(postId: string): Promise<number> {
    return await prisma.redditPostComment.count({
      where: { postId }
    });
  }
  
  /**
   * Check if comments have been fetched for a post
   */
  static async hasComments(postId: string): Promise<boolean> {
    const count = await this.getCommentCount(postId);
    return count > 0;
  }
}