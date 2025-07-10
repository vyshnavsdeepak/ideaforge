import { createRedditClient } from './reddit-client';

export interface RedditUserProfile {
  id: string;
  name: string;
  created: number;
  link_karma: number;
  comment_karma: number;
  total_karma: number;
  is_suspended: boolean;
  has_verified_email: boolean;
  subreddit?: {
    display_name: string;
    title: string;
    public_description: string;
  };
}

export interface RedditUserPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  subreddit: string;
  author: string;
  score: number;
  ups: number;
  downs: number;
  num_comments: number;
  created_utc: number;
  is_video: boolean;
  is_image: boolean;
  is_self: boolean;
  over_18: boolean;
  spoiler: boolean;
  locked: boolean;
  stickied: boolean;
  post_hint?: string;
  url_overridden_by_dest?: string;
}

export interface RedditUserComment {
  id: string;
  body: string;
  permalink: string;
  subreddit: string;
  author: string;
  score: number;
  created_utc: number;
  link_id: string; // Post ID this comment belongs to
  link_title?: string; // Post title
  parent_id: string;
  is_submitter: boolean;
  score_hidden: boolean;
  edited: boolean | number;
  depth: number;
}

export interface UserActivityResponse {
  kind: string;
  data: {
    after?: string;
    before?: string;
    children: Array<{
      kind: string; // "t1" for comment, "t3" for post
      data: RedditUserPost | RedditUserComment;
    }>;
  };
}

export class RedditUserScraper {
  private client = createRedditClient();

  /**
   * Fetch user profile information
   */
  async fetchUserProfile(username: string): Promise<RedditUserProfile> {
    const url = `https://www.reddit.com/user/${username}/about.json`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'web:IdeaForge:v2.0.0 (by /u/OpportunityBot)',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`User u/${username} not found`);
        }
        throw new Error(`Failed to fetch user profile: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.kind !== 't2') {
        throw new Error('Invalid user profile response');
      }

      return data.data;
    } catch (error) {
      console.error(`Error fetching user profile for u/${username}:`, error);
      throw error;
    }
  }

  /**
   * Fetch user posts with pagination
   */
  async fetchUserPosts(
    username: string,
    options: {
      limit?: number;
      after?: string;
      before?: string;
      sort?: 'hot' | 'new' | 'top';
      t?: 'all' | 'year' | 'month' | 'week' | 'day';
    } = {}
  ): Promise<{ posts: RedditUserPost[]; after?: string; before?: string }> {
    const { limit = 100, after, before, sort = 'new', t = 'all' } = options;
    
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('sort', sort);
    params.append('t', t);
    if (after) params.append('after', after);
    if (before) params.append('before', before);

    const url = `https://www.reddit.com/user/${username}/submitted.json?${params}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'web:IdeaForge:v2.0.0 (by /u/OpportunityBot)',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user posts: ${response.status} ${response.statusText}`);
      }

      const data: UserActivityResponse = await response.json();
      
      const posts = data.data.children
        .filter(child => child.kind === 't3')
        .map(child => child.data as RedditUserPost);

      return {
        posts,
        after: data.data.after,
        before: data.data.before,
      };
    } catch (error) {
      console.error(`Error fetching posts for u/${username}:`, error);
      throw error;
    }
  }

  /**
   * Fetch user comments with pagination
   */
  async fetchUserComments(
    username: string,
    options: {
      limit?: number;
      after?: string;
      before?: string;
      sort?: 'hot' | 'new' | 'top';
      t?: 'all' | 'year' | 'month' | 'week' | 'day';
    } = {}
  ): Promise<{ comments: RedditUserComment[]; after?: string; before?: string }> {
    const { limit = 100, after, before, sort = 'new', t = 'all' } = options;
    
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('sort', sort);
    params.append('t', t);
    if (after) params.append('after', after);
    if (before) params.append('before', before);

    const url = `https://www.reddit.com/user/${username}/comments.json?${params}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'web:IdeaForge:v2.0.0 (by /u/OpportunityBot)',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user comments: ${response.status} ${response.statusText}`);
      }

      const data: UserActivityResponse = await response.json();
      
      const comments = data.data.children
        .filter(child => child.kind === 't1')
        .map(child => child.data as RedditUserComment);

      return {
        comments,
        after: data.data.after,
        before: data.data.before,
      };
    } catch (error) {
      console.error(`Error fetching comments for u/${username}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all user activity (posts + comments) with pagination
   */
  async fetchUserActivity(
    username: string,
    options: {
      limit?: number;
      after?: string;
      before?: string;
      sort?: 'hot' | 'new' | 'top';
      t?: 'all' | 'year' | 'month' | 'week' | 'day';
    } = {}
  ): Promise<{ 
    posts: RedditUserPost[]; 
    comments: RedditUserComment[]; 
    after?: string; 
    before?: string;
  }> {
    const { limit = 100, after, before, sort = 'new', t = 'all' } = options;
    
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('sort', sort);
    params.append('t', t);
    if (after) params.append('after', after);
    if (before) params.append('before', before);

    const url = `https://www.reddit.com/user/${username}/.json?${params}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'web:IdeaForge:v2.0.0 (by /u/OpportunityBot)',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user activity: ${response.status} ${response.statusText}`);
      }

      const data: UserActivityResponse = await response.json();
      
      const posts: RedditUserPost[] = [];
      const comments: RedditUserComment[] = [];

      data.data.children.forEach(child => {
        if (child.kind === 't3') {
          posts.push(child.data as RedditUserPost);
        } else if (child.kind === 't1') {
          comments.push(child.data as RedditUserComment);
        }
      });

      return {
        posts,
        comments,
        after: data.data.after,
        before: data.data.before,
      };
    } catch (error) {
      console.error(`Error fetching activity for u/${username}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all user posts (handles pagination automatically)
   */
  async fetchAllUserPosts(
    username: string,
    options: {
      maxPosts?: number;
      sort?: 'hot' | 'new' | 'top';
      t?: 'all' | 'year' | 'month' | 'week' | 'day';
      onProgress?: (progress: { fetched: number; total?: number }) => void;
    } = {}
  ): Promise<RedditUserPost[]> {
    const { maxPosts = 1000, sort = 'new', t = 'all', onProgress } = options;
    
    const allPosts: RedditUserPost[] = [];
    let after: string | undefined;
    let hasMore = true;
    
    while (hasMore && allPosts.length < maxPosts) {
      const remainingPosts = maxPosts - allPosts.length;
      const limit = Math.min(100, remainingPosts);
      
      const { posts, after: nextAfter } = await this.fetchUserPosts(username, {
        limit,
        after,
        sort,
        t,
      });
      
      allPosts.push(...posts);
      after = nextAfter;
      hasMore = !!nextAfter && posts.length > 0;
      
      onProgress?.({ fetched: allPosts.length, total: maxPosts });
      
      // Rate limiting - wait 1 second between requests
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return allPosts;
  }

  /**
   * Fetch all user comments (handles pagination automatically)
   */
  async fetchAllUserComments(
    username: string,
    options: {
      maxComments?: number;
      sort?: 'hot' | 'new' | 'top';
      t?: 'all' | 'year' | 'month' | 'week' | 'day';
      onProgress?: (progress: { fetched: number; total?: number }) => void;
    } = {}
  ): Promise<RedditUserComment[]> {
    const { maxComments = 1000, sort = 'new', t = 'all', onProgress } = options;
    
    const allComments: RedditUserComment[] = [];
    let after: string | undefined;
    let hasMore = true;
    
    while (hasMore && allComments.length < maxComments) {
      const remainingComments = maxComments - allComments.length;
      const limit = Math.min(100, remainingComments);
      
      const { comments, after: nextAfter } = await this.fetchUserComments(username, {
        limit,
        after,
        sort,
        t,
      });
      
      allComments.push(...comments);
      after = nextAfter;
      hasMore = !!nextAfter && comments.length > 0;
      
      onProgress?.({ fetched: allComments.length, total: maxComments });
      
      // Rate limiting - wait 1 second between requests
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return allComments;
  }
}

export const redditUserScraper = new RedditUserScraper();