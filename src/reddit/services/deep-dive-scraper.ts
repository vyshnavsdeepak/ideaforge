import { RedditClient } from './reddit-client';
import { ProcessedRedditPost } from './reddit-client';
import { checkRedditPostDuplication, storeRedditPost } from '@/shared/services/deduplication';

interface RedditAPIPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  author: string;
  score: number;
  ups: number;
  downs: number;
  num_comments: number;
  url: string;
  permalink: string;
  created_utc: number;
}

export interface DeepDiveScrapingOptions {
  subreddit: string;
  targetDate: Date;                    // Scrape back to this date
  maxPosts?: number;                   // Maximum posts to scrape (no limit if not specified)
  sortTypes?: ('hot' | 'new' | 'top' | 'rising')[];  // Which sorting types to use
  timeframes?: ('hour' | 'day' | 'week' | 'month' | 'year' | 'all')[];  // For 'top' sort
  includeComments?: boolean;           // Whether to scrape comments too
  batchSize?: number;                  // Posts per API request (default 100)
  delayBetweenRequests?: number;       // Delay in ms between requests
  onProgress?: (progress: DeepDiveProgress) => void;
}

export interface DeepDiveProgress {
  totalScraped: number;
  newPosts: number;
  duplicates: number;
  currentDate: Date;
  targetDate: Date;
  sortType: string;
  timeframe?: string;
  estimatedRemaining?: number;
  isComplete: boolean;
  errors: string[];
}

export interface DeepDiveResult {
  subreddit: string;
  totalPostsScraped: number;
  newPostsStored: number;
  duplicatesSkipped: number;
  oldestPostDate: Date;
  newestPostDate: Date;
  targetDate: Date;
  sortTypesUsed: string[];
  timeframesUsed: string[];
  commentsScraped?: number;
  totalRequests: number;
  duration: number;
  errors: string[];
  isComplete: boolean;
}

export class DeepDiveScraper {
  private redditClient: RedditClient;
  
  constructor() {
    this.redditClient = new RedditClient();
  }

  /**
   * Perform a comprehensive deep-dive scraping of a subreddit
   */
  async scrapeSubredditDeepDive(options: DeepDiveScrapingOptions): Promise<DeepDiveResult> {
    const startTime = Date.now();
    const {
      subreddit,
      targetDate,
      maxPosts,
      sortTypes = ['hot', 'new', 'top'],
      timeframes = ['week', 'month', 'year', 'all'],
      includeComments = false,
      batchSize = 100,
      delayBetweenRequests = 1000, // 1 second delay
      onProgress
    } = options;

    console.log(`[DEEP_DIVE] Starting comprehensive scraping of r/${subreddit}`);
    console.log(`[DEEP_DIVE] Target date: ${targetDate.toISOString()}`);
    console.log(`[DEEP_DIVE] Max posts: ${maxPosts || 'unlimited'}`);
    console.log(`[DEEP_DIVE] Sort types: ${sortTypes.join(', ')}`);

    const result: DeepDiveResult = {
      subreddit,
      totalPostsScraped: 0,
      newPostsStored: 0,
      duplicatesSkipped: 0,
      oldestPostDate: new Date(),
      newestPostDate: new Date(0),
      targetDate,
      sortTypesUsed: sortTypes,
      timeframesUsed: timeframes,
      totalRequests: 0,
      duration: 0,
      errors: [],
      isComplete: false
    };

    try {
      // Process each sort type
      for (const sortType of sortTypes) {
        if (maxPosts && result.totalPostsScraped >= maxPosts) {
          console.log(`[DEEP_DIVE] Reached max posts limit: ${maxPosts}`);
          break;
        }

        if (sortType === 'top') {
          // For 'top' sort, process each timeframe
          for (const timeframe of timeframes) {
            const scrapedInTimeframe = await this.scrapeWithSortAndTimeframe(
              subreddit,
              sortType,
              timeframe,
              targetDate,
              maxPosts ? maxPosts - result.totalPostsScraped : undefined,
              batchSize,
              delayBetweenRequests,
              result,
              onProgress
            );
            
            if (scrapedInTimeframe === 0) break; // No more posts in this timeframe
          }
        } else {
          // For other sort types, scrape without timeframe
          await this.scrapeWithSortAndTimeframe(
            subreddit,
            sortType,
            undefined,
            targetDate,
            maxPosts ? maxPosts - result.totalPostsScraped : undefined,
            batchSize,
            delayBetweenRequests,
            result,
            onProgress
          );
        }
      }

      // Scrape comments if requested
      if (includeComments && result.newPostsStored > 0) {
        console.log(`[DEEP_DIVE] Starting comment scraping for ${result.newPostsStored} new posts`);
        result.commentsScraped = await this.scrapeCommentsForNewPosts(subreddit, result);
      }

      result.isComplete = true;
      result.duration = Date.now() - startTime;

      console.log(`[DEEP_DIVE] Deep dive complete for r/${subreddit}`);
      console.log(`[DEEP_DIVE] Results: ${result.totalPostsScraped} total, ${result.newPostsStored} new, ${result.duplicatesSkipped} duplicates`);
      console.log(`[DEEP_DIVE] Duration: ${Math.round(result.duration / 1000)}s`);

      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.duration = Date.now() - startTime;
      console.error(`[DEEP_DIVE] Deep dive failed for r/${subreddit}:`, error);
      throw error;
    }
  }

  /**
   * Scrape posts with specific sort type and optional timeframe
   */
  private async scrapeWithSortAndTimeframe(
    subreddit: string,
    sortType: 'hot' | 'new' | 'top' | 'rising',
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' | undefined,
    targetDate: Date,
    maxPosts: number | undefined,
    batchSize: number,
    delayBetweenRequests: number,
    result: DeepDiveResult,
    onProgress?: (progress: DeepDiveProgress) => void
  ): Promise<number> {
    const logPrefix = `[DEEP_DIVE:${sortType}${timeframe ? `:${timeframe}` : ''}]`;
    console.log(`${logPrefix} Starting scraping back to ${targetDate.toISOString()}`);
    
    let after: string | undefined;
    let totalScrapedInSort = 0;
    let hasMorePosts = true;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    while (hasMorePosts && (maxPosts === undefined || totalScrapedInSort < maxPosts)) {
      try {
        console.log(`${logPrefix} Requesting batch ${Math.floor(totalScrapedInSort / batchSize) + 1}, after: ${after || 'start'}`);
        
        // Build URL with timeframe for 'top' sort
        let url = `https://www.reddit.com/r/${subreddit}/${sortType}.json?limit=${batchSize}`;
        if (after) url += `&after=${after}`;
        if (sortType === 'top' && timeframe) url += `&t=${timeframe}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'DeepDiveBot/1.0 (Reddit Content Analysis)'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const posts = data.data.children;
        result.totalRequests++;

        if (!posts || posts.length === 0) {
          console.log(`${logPrefix} No more posts available`);
          hasMorePosts = false;
          break;
        }

        let postsProcessedInBatch = 0;
        let reachedTargetDate = false;

        // Process each post in the batch
        for (const postWrapper of posts) {
          const post = postWrapper.data;
          const postDate = new Date(post.created_utc * 1000);

          // Check if we've reached the target date
          if (postDate < targetDate) {
            console.log(`${logPrefix} Reached target date with post from ${postDate.toISOString()}`);
            reachedTargetDate = true;
            break;
          }

          // Update date range tracking
          if (postDate > result.newestPostDate) {
            result.newestPostDate = postDate;
          }
          if (postDate < result.oldestPostDate) {
            result.oldestPostDate = postDate;
          }

          // Process the post
          const processedPost = this.convertToProcessedPost(post);
          
          // Check for duplicates
          const duplicationResult = await checkRedditPostDuplication(
            processedPost.redditId,
            processedPost.title,
            processedPost.content,
            processedPost.subreddit,
            processedPost.author
          );

          if (duplicationResult.isDuplicate) {
            result.duplicatesSkipped++;
            console.log(`${logPrefix} Duplicate post: ${processedPost.redditId}`);
          } else {
            // Store new post
            await storeRedditPost(processedPost);
            result.newPostsStored++;
            console.log(`${logPrefix} Stored new post: ${processedPost.title.substring(0, 50)}...`);
          }

          result.totalPostsScraped++;
          totalScrapedInSort++;
          postsProcessedInBatch++;

          // Report progress
          if (onProgress) {
            onProgress({
              totalScraped: result.totalPostsScraped,
              newPosts: result.newPostsStored,
              duplicates: result.duplicatesSkipped,
              currentDate: postDate,
              targetDate,
              sortType: `${sortType}${timeframe ? `:${timeframe}` : ''}`,
              timeframe,
              isComplete: false,
              errors: result.errors
            });
          }

          // Check if we've hit the max posts limit
          if (maxPosts && totalScrapedInSort >= maxPosts) {
            console.log(`${logPrefix} Reached max posts limit for this sort: ${maxPosts}`);
            hasMorePosts = false;
            break;
          }
        }

        // If we reached the target date or processed fewer posts than requested, we're done
        if (reachedTargetDate || postsProcessedInBatch < batchSize) {
          hasMorePosts = false;
          break;
        }

        // Set up for next batch
        after = data.data.after;
        if (!after) {
          console.log(`${logPrefix} No more posts available (no 'after' token)`);
          hasMorePosts = false;
          break;
        }

        // Reset error counter on successful batch
        consecutiveErrors = 0;

        // Delay between requests to be respectful
        if (delayBetweenRequests > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }

        console.log(`${logPrefix} Batch complete: ${postsProcessedInBatch} posts processed, ${totalScrapedInSort} total in sort`);

      } catch (error) {
        consecutiveErrors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${logPrefix} ${errorMessage}`);
        
        console.error(`${logPrefix} Error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);

        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`${logPrefix} Too many consecutive errors, stopping this sort type`);
          break;
        }

        // Wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests * 2));
      }
    }

    console.log(`${logPrefix} Completed: ${totalScrapedInSort} posts scraped`);
    return totalScrapedInSort;
  }

  /**
   * Convert Reddit API post to ProcessedRedditPost format
   */
  private convertToProcessedPost(post: RedditAPIPost): ProcessedRedditPost {
    return {
      redditId: post.id,
      title: post.title,
      content: post.selftext || '',
      subreddit: post.subreddit,
      author: post.author,
      score: post.score,
      upvotes: post.ups,
      downvotes: post.downs,
      numComments: post.num_comments,
      url: post.url,
      permalink: post.permalink,
      createdUtc: new Date(post.created_utc * 1000)
    };
  }

  /**
   * Scrape comments for newly stored posts
   */
  private async scrapeCommentsForNewPosts(subreddit: string, result: DeepDiveResult): Promise<number> {
    // This would integrate with the existing comment scraping functionality
    // For now, return 0 as placeholder
    console.log(`[DEEP_DIVE] Comment scraping not yet implemented for ${result.newPostsStored} posts`);
    return 0;
  }

  /**
   * Estimate how long a deep dive will take
   */
  async estimateDeepDiveEffort(subreddit: string, targetDate: Date): Promise<{
    estimatedPosts: number;
    estimatedDuration: string;
    estimatedRequests: number;
  }> {
    // Sample a few pages to estimate total posts
    try {
      const sampleResponse = await fetch(`https://www.reddit.com/r/${subreddit}/new.json?limit=100`, {
        headers: {
          'User-Agent': 'DeepDiveBot/1.0 (Reddit Content Analysis)'
        }
      });

      if (!sampleResponse.ok) {
        throw new Error(`Cannot access r/${subreddit}`);
      }

      const sampleData = await sampleResponse.json();
      const samplePosts = sampleData.data.children;
      
      if (samplePosts.length === 0) {
        return {
          estimatedPosts: 0,
          estimatedDuration: '0 minutes',
          estimatedRequests: 0
        };
      }

      // Estimate based on post frequency
      const newestPost = new Date(samplePosts[0].data.created_utc * 1000);
      const oldestPost = new Date(samplePosts[samplePosts.length - 1].data.created_utc * 1000);
      const timeSpan = newestPost.getTime() - oldestPost.getTime();
      const postsPerMs = samplePosts.length / timeSpan;
      
      const targetTimeSpan = newestPost.getTime() - targetDate.getTime();
      const estimatedPosts = Math.round(postsPerMs * targetTimeSpan);
      const estimatedRequests = Math.ceil(estimatedPosts / 100) * 3; // 3 sort types
      const estimatedMinutes = Math.round(estimatedRequests * 1.5 / 60); // 1.5s per request

      return {
        estimatedPosts,
        estimatedDuration: `${estimatedMinutes} minutes`,
        estimatedRequests
      };

    } catch (error) {
      console.error('[DEEP_DIVE] Error estimating effort:', error);
      return {
        estimatedPosts: 0,
        estimatedDuration: 'unknown',
        estimatedRequests: 0
      };
    }
  }
}