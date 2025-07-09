import { RedditAPIError } from './reddit';

interface RedditOAuthConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
}

interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class RedditAuthClient {
  private accessToken?: string;
  private tokenExpiry?: Date;
  private readonly baseAuthUrl = 'https://www.reddit.com/api/v1/access_token';
  private readonly baseOAuthUrl = 'https://oauth.reddit.com';

  constructor(private config: RedditOAuthConfig) {
    // Validate config
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Reddit client ID and secret are required for authentication');
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    // Otherwise, get a new token
    return this.authenticate();
  }

  /**
   * Authenticate with Reddit using the "script" app type flow (password grant)
   */
  private async authenticate(): Promise<string> {
    try {
      console.log('[REDDIT_AUTH] Authenticating with Reddit OAuth...');

      // Prepare the authentication request
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const params = new URLSearchParams({
        grant_type: 'password',
        username: this.config.username,
        password: this.config.password,
      });

      const response = await fetch(this.baseAuthUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.config.userAgent,
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[REDDIT_AUTH] Authentication failed:', response.status, errorText);
        
        const error = new Error(`Reddit authentication failed: ${response.status} ${response.statusText}`) as RedditAPIError;
        error.status = response.status;
        error.isBlocked = response.status === 403;
        throw error;
      }

      const data: RedditTokenResponse = await response.json();
      
      // Store the token and calculate expiry
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000) - 60000); // Expire 1 minute early
      
      console.log('[REDDIT_AUTH] Successfully authenticated with Reddit');
      console.log(`[REDDIT_AUTH] Token expires at: ${this.tokenExpiry.toISOString()}`);
      
      return this.accessToken;
    } catch (error) {
      console.error('[REDDIT_AUTH] Authentication error:', error);
      throw error;
    }
  }

  /**
   * Make an authenticated request to Reddit API
   */
  async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAccessToken();
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseOAuthUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': this.config.userAgent,
        ...options.headers,
      },
    });

    // Handle token expiration - let Inngest handle the retry
    if (response.status === 401) {
      console.log('[REDDIT_AUTH] Token expired, invalidating current token for retry...');
      this.accessToken = undefined;
      this.tokenExpiry = undefined;
      
      // Throw error to let Inngest handle the retry
      const tokenError = new Error('Reddit OAuth token expired') as RedditAPIError;
      tokenError.status = 401;
      tokenError.isRateLimited = false;
      tokenError.isBlocked = false;
      throw tokenError;
    }

    return response;
  }

  /**
   * Test the authentication by making a simple API call
   */
  async testAuth(): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest('/api/v1/me');
      const data = await response.json();
      
      if (data.name) {
        console.log(`[REDDIT_AUTH] Authenticated as: ${data.name}`);
        console.log(`[REDDIT_AUTH] Karma: ${data.link_karma + data.comment_karma}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[REDDIT_AUTH] Test auth failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create authenticated Reddit client
 */
export function createRedditAuthClient(): RedditAuthClient | null {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;
  const userAgent = process.env.REDDIT_USER_AGENT;
  
  if (!clientId || !clientSecret || !username || !password) {
    console.warn('[REDDIT_AUTH] Reddit OAuth credentials not configured');
    console.warn('[REDDIT_AUTH] Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD, and REDDIT_USER_AGENT in .env');
    return null;
  }
  
  return new RedditAuthClient({
    clientId,
    clientSecret,
    username,
    password,
    userAgent: userAgent || `web:IdeaForge:v2.0.0 (by /u/${username})`,
  });
}