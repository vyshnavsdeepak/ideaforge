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
];

export class RedditClient {
  private readonly baseUrl = 'https://www.reddit.com';
  private readonly headers = {
    'User-Agent': 'OpportunityFinder/1.0.0 (by /u/OpportunityBot)',
  };

  async fetchSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    limit: number = 25
  ): Promise<ProcessedRedditPost[]> {
    try {
      const url = `${this.baseUrl}/r/${subreddit}/${sort}.json?limit=${limit}`;
      
      const response = await fetch(url, {
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }

      const data: RedditResponse = await response.json();
      return this.processRedditResponse(data);
    } catch (error) {
      console.error(`Error fetching r/${subreddit}:`, error);
      throw error;
    }
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