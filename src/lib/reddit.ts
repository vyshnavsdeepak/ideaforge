export interface RedditPost {
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
  over_18: boolean;
  stickied: boolean;
  locked: boolean;
  is_self: boolean;
}

export interface RedditResponse {
  kind: string;
  data: {
    after?: string;
    before?: string;
    children: Array<{
      kind: string;
      data: RedditPost;
    }>;
  };
}

export interface ProcessedRedditPost {
  redditId: string;
  title: string;
  content: string;
  subreddit: string;
  author: string;
  score: number;
  upvotes: number;
  downvotes: number;
  numComments: number;
  url: string;
  permalink: string;
  createdUtc: Date;
}

export const TARGET_SUBREDDITS = [
  'entrepreneur',
  'startups', 
  'smallbusiness',
  'business',
  'accounting',
  'finance',
  'investing',
  'legaladvice',
  'lawyers',
  'medicine',
  'healthcare',
  'programming',
  'webdev',
  'datascience',
  'MachineLearning',
  'artificialintelligence',
  'PromptEngineering',
];

export interface RedditAPIError extends Error {
  status?: number;
  retryAfter?: number;
  isRateLimited?: boolean;
  isBlocked?: boolean;
}

export class RedditClient {
  private readonly baseUrl = 'https://www.reddit.com';
  private readonly headers = {
    'User-Agent': 'OpportunityFinder/1.0.0 (by /u/OpportunityBot)',
    'Accept': 'application/json',
  };
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  async fetchSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    limit: number = 25
  ): Promise<ProcessedRedditPost[]> {
    const url = `${this.baseUrl}/r/${subreddit}/${sort}.json?limit=${limit}`;
    
    return this.retryWithBackoff(async () => {
      // Create timeout controller for older Node.js versions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(url, {
          headers: this.headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        await this.handleResponseErrors(response, subreddit);
        
        const data: RedditResponse = await response.json();
        return this.processRedditResponse(data);
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle network errors that don't have a response object
        if (error instanceof Error && !('status' in error)) {
          const networkError = new Error(`Network error accessing r/${subreddit}: ${error.message}`) as RedditAPIError;
          networkError.isBlocked = false;
          networkError.isRateLimited = false;
          throw networkError;
        }
        
        throw error;
      }
    });
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const redditError = error as RedditAPIError;
      
      // Don't retry on permanent blocks or if we've exceeded max retries
      if (redditError.isBlocked || attempt >= this.maxRetries) {
        throw error;
      }
      
      // Don't retry network errors (not Reddit API errors)
      if (!redditError.status) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = redditError.retryAfter || (this.baseDelay * Math.pow(2, attempt - 1));
      
      console.warn(`Reddit API attempt ${attempt} failed, retrying in ${delay}ms:`, (error as Error).message);
      
      await this.sleep(delay);
      return this.retryWithBackoff(operation, attempt + 1);
    }
  }

  private async handleResponseErrors(response: Response, subreddit: string): Promise<void> {
    if (response.ok) return;

    const error: RedditAPIError = new Error(
      `Reddit API error for r/${subreddit}: ${response.status} ${response.statusText}`
    );
    error.status = response.status;

    // Handle specific error cases
    switch (response.status) {
      case 403:
        error.isBlocked = true;
        error.message = `Access blocked to r/${subreddit}. This could be due to:
- Subreddit is private/restricted
- Reddit is blocking requests without authentication
- IP-based rate limiting
- User-Agent restrictions`;
        break;
        
      case 429:
        error.isRateLimited = true;
        const retryAfter = response.headers.get('retry-after');
        error.retryAfter = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
        error.message = `Rate limited for r/${subreddit}. Retry after ${error.retryAfter}ms`;
        break;
        
      case 404:
        error.isBlocked = true;
        error.message = `Subreddit r/${subreddit} not found or may be private`;
        break;
        
      case 503:
        error.message = `Reddit service unavailable. Reddit may be experiencing downtime.`;
        error.retryAfter = 300000; // 5 minutes
        break;
        
      default:
        error.message = `Unexpected Reddit API error: ${response.status} ${response.statusText}`;
    }

    throw error;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private processRedditResponse(response: RedditResponse): ProcessedRedditPost[] {
    return response.data.children
      .map((child) => child.data)
      .filter(this.filterPosts)
      .map(this.transformPost);
  }

  private filterPosts = (post: RedditPost): boolean => {
    if (post.stickied || post.locked || post.over_18) {
      return false;
    }

    if (!post.selftext && !post.title) {
      return false;
    }

    if (post.score < 5 || post.num_comments < 3) {
      return false;
    }

    const noiseKeywords = [
      'weekly thread',
      'daily thread', 
      'megathread',
      'announcement',
      'reminder',
      'rules',
      'meta',
    ];

    const titleLower = post.title.toLowerCase();
    if (noiseKeywords.some((keyword) => titleLower.includes(keyword))) {
      return false;
    }

    return true;
  };

  private transformPost = (post: RedditPost): ProcessedRedditPost => {
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
      permalink: post.permalink, // Store the raw permalink path from Reddit API
      createdUtc: new Date(post.created_utc * 1000),
    };
  };
}