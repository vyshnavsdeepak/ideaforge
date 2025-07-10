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

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
  created_utc: number;
  subreddit?: string;
  parent_id?: string;
  replies?: {
    data?: {
      children?: unknown[];
    };
  };
}

export interface RedditCommentResponse {
  kind: string;
  data: {
    children: Array<{
      kind: string;
      data: RedditComment;
    }>;
  };
}

// Legacy export for backwards compatibility
// Use getActiveSubredditNames() from subreddit-config.ts instead
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
  'Instagram',
];

export interface RedditAPIError extends Error {
  status?: number;
  retryAfter?: number;
  isRateLimited?: boolean;
  isBlocked?: boolean;
}

export class RedditClient {
  protected readonly baseUrl = 'https://oauth.reddit.com';
  protected readonly authUrl = 'https://www.reddit.com/api/v1/access_token';
  protected accessToken: string | null = null;
  protected tokenExpiry: number = 0;
  
  protected readonly headers = {
    'User-Agent': process.env.REDDIT_USER_AGENT || 'web:IdeaForge:v2.0.0 (by /u/OpportunityBot)',
    'Accept': 'application/json',
  };

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new access token
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;

    if (!clientId || !clientSecret || !username || !password) {
      throw new Error('Reddit OAuth credentials not configured');
    }

    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.headers['User-Agent'],
      },
      body: `grant_type=password&username=${username}&password=${password}`,
    });

    if (!response.ok) {
      throw new Error(`Reddit OAuth failed: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
    // Set expiry to 50 minutes (tokens last 1 hour)
    this.tokenExpiry = Date.now() + (tokenData.expires_in - 600) * 1000;
    
    console.log(`[REDDIT_AUTH] Got new access token, expires in ${tokenData.expires_in} seconds`);
    
    if (!this.accessToken) {
      throw new Error('Failed to get access token from Reddit OAuth response');
    }
    
    return this.accessToken;
  }

  private async getAuthenticatedHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      ...this.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  async fetchSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    limit: number = 25
  ): Promise<ProcessedRedditPost[]> {
    const url = `${this.baseUrl}/r/${subreddit}/${sort}?limit=${limit}`;
    
    // Create timeout controller for older Node.js versions
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      console.log(`[REDDIT] Fetching ${sort} posts from r/${subreddit} (limit: ${limit})`);
      
      const authHeaders = await this.getAuthenticatedHeaders();
      const response = await fetch(url, {
        headers: authHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      // Monitor rate limit headers
      this.logRateLimitInfo(response, subreddit);
      
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
  }

  /**
   * Log rate limit information from Reddit API headers
   */
  protected logRateLimitInfo(response: Response, subreddit: string): void {
    try {
      const used = response.headers?.get('X-Ratelimit-Used');
      const remaining = response.headers?.get('X-Ratelimit-Remaining');
      const reset = response.headers?.get('X-Ratelimit-Reset');
      
      if (used || remaining || reset) {
        console.log(`[REDDIT_RATE_LIMIT] r/${subreddit}: Used=${used || 'N/A'}, Remaining=${remaining || 'N/A'}, Reset=${reset || 'N/A'}`);
        
        // Warn if approaching rate limit
        if (remaining && parseInt(remaining) < 10) {
          console.warn(`[REDDIT_RATE_LIMIT] Warning: Only ${remaining} requests remaining before rate limit`);
        }
      }
    } catch {
      // Ignore errors when checking rate limit headers (e.g., in tests)
    }
  }


  protected async handleResponseErrors(response: Response, subreddit: string): Promise<void> {
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


  protected processRedditResponse(response: RedditResponse): ProcessedRedditPost[] {
    return response.data.children
      .map((child) => child.data)
      .filter(this.filterPosts)
      .map(this.transformPost);
  }

  protected filterPosts = (post: RedditPost): boolean => {
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

  protected transformPost = (post: RedditPost): ProcessedRedditPost => {
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

  async fetchPostComments(permalink: string): Promise<RedditComment[]> {
    // Ensure permalink has correct format for comments  
    const commentsUrl = `${this.baseUrl}${permalink}.json`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      console.log(`[REDDIT] Fetching comments from ${permalink}`);
      
      const authHeaders = await this.getAuthenticatedHeaders();
      const response = await fetch(commentsUrl, {
        headers: authHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Reddit comments API returns an array: [post_data, comments_data]
      if (!Array.isArray(data) || data.length < 2) {
        throw new Error('Invalid comments response format');
      }

      const commentsData = data[1];
      return this.processCommentsResponse(commentsData);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  protected processCommentsResponse(response: RedditCommentResponse): RedditComment[] {
    const comments: RedditComment[] = [];
    
    const processComment = (child: unknown) => {
      const c = child as { kind: string; data?: RedditComment };
      if (c.kind === 't1' && c.data) {
        const comment = c.data;
        
        // Skip deleted/removed comments
        if (comment.body === '[deleted]' || comment.body === '[removed]') {
          return;
        }
        
        comments.push({
          id: comment.id,
          body: comment.body,
          author: comment.author,
          score: comment.score,
          created_utc: comment.created_utc,
          subreddit: comment.subreddit,
          parent_id: comment.parent_id,
        });
        
        // Process replies recursively
        if (comment.replies && typeof comment.replies === 'object' && 'data' in comment.replies) {
          const repliesData = comment.replies.data as { children?: unknown[] };
          if (repliesData.children) {
            repliesData.children.forEach(processComment);
          }
        }
      }
    };
    
    if (response.data && response.data.children) {
      response.data.children.forEach(processComment);
    }
    
    return comments;
  }
}

// Import auth client
import { RedditAuthClient, createRedditAuthClient } from './auth';

/**
 * Authenticated Reddit Client that uses OAuth
 */
export class AuthenticatedRedditClient extends RedditClient {
  private authClient: RedditAuthClient;

  constructor(authClient: RedditAuthClient) {
    super();
    this.authClient = authClient;
  }

  async fetchSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    limit: number = 25
  ): Promise<ProcessedRedditPost[]> {
    console.log(`[REDDIT_AUTH] Fetching r/${subreddit} with authentication`);
    
    // Reddit API has a maximum limit of 100 per request
    // For historical recovery, we'll use the maximum
    const actualLimit = Math.min(limit, 100);
    const endpoint = `/r/${subreddit}/${sort}?limit=${actualLimit}&raw_json=1`;
    
    try {
      const response = await this.authClient.makeAuthenticatedRequest(endpoint);
      
      // Monitor rate limit headers for authenticated requests
      this.logRateLimitInfo(response, subreddit);
      
      if (!response.ok) {
        // Use parent class error handling
        await this.handleResponseErrors(response, subreddit);
      }
      
      const data: RedditResponse = await response.json();
      return this.processRedditResponse(data);
    } catch (error) {
      // Handle network errors
      if (error instanceof Error && !('status' in error)) {
        const networkError = new Error(`Network error accessing r/${subreddit}: ${error.message}`) as RedditAPIError;
        networkError.isBlocked = false;
        networkError.isRateLimited = false;
        throw networkError;
      }
      
      throw error;
    }
  }
}

/**
 * Factory function to create the appropriate Reddit client
 */
export function createRedditClient(): RedditClient {
  // Try to create authenticated client first
  const authClient = createRedditAuthClient();
  
  if (authClient) {
    console.log('[REDDIT] Using authenticated Reddit client');
    return new AuthenticatedRedditClient(authClient);
  } else {
    console.log('[REDDIT] Using unauthenticated Reddit client (rate limits apply)');
    return new RedditClient();
  }
}