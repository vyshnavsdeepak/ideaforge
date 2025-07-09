# Reddit API Troubleshooting Guide

## Current Issue: 403 Blocked Errors

You're experiencing `403 Blocked` errors when scraping Reddit. This is a common issue that can be resolved through several approaches.

## Understanding Reddit's API Policies

### Why 403 Errors Occur
1. **Rate Limiting**: Reddit heavily rate limits unauthenticated requests
2. **User-Agent Restrictions**: Reddit blocks generic or suspicious user agents
3. **IP-based Blocking**: Reddit may block certain IP ranges or data centers
4. **Authentication Required**: Some subreddits require OAuth authentication
5. **Cloudflare Protection**: Reddit uses Cloudflare which can block automated requests

## Solutions Implemented

### 1. Enhanced Error Handling ✅
The Reddit client now includes:
- **Specific error detection** for 403, 429, 404, and 503 errors
- **Exponential backoff** with configurable retry delays
- **Smart retry logic** that doesn't retry permanent blocks
- **Graceful degradation** that continues processing other subreddits

### 2. Improved Request Headers ✅
```typescript
headers: {
  'User-Agent': 'OpportunityFinder/1.0.0 (by /u/OpportunityBot)',
  'Accept': 'application/json',
}
```

## Recommended Solutions

### Option 1: Reddit OAuth Authentication (Recommended)

**Setup Steps:**
1. Create a Reddit app at https://www.reddit.com/prefs/apps
2. Choose "script" or "web app" type
3. Get your client ID and secret
4. Add authentication to the Reddit client

**Environment Variables:**
```env
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password
```

**Benefits:**
- Higher rate limits (60 requests/minute vs 10)
- Access to private/restricted subreddits
- More reliable and sustainable
- Reddit officially supports this approach

### Option 2: Use Reddit API Proxy Services

**Services to Consider:**
- **Pushshift.io**: Historical Reddit data (free/paid)
- **Reddit API via RapidAPI**: Managed Reddit access
- **Snoowrap**: Node.js Reddit API wrapper with authentication

### Option 3: Alternative Data Sources

**Reddit-like Sources:**
- **Hacker News API**: Y Combinator community (free)
- **Product Hunt API**: Startup/product discussions
- **Indie Hackers**: Via web scraping or API
- **Discord servers**: Public channels via Discord API

### Option 4: Implement Request Rotation

**Techniques:**
- **Proxy rotation**: Use different IP addresses
- **User-Agent rotation**: Vary browser signatures
- **Request timing**: Add random delays between requests
- **Session management**: Rotate cookies/sessions

## Current Implementation Status

### ✅ Implemented Features
- Exponential backoff retry logic
- Specific error handling for different HTTP status codes
- Graceful degradation for blocked subreddits
- Comprehensive logging for debugging
- Block logging for monitoring

### 🔄 Error Handling Flow
1. **First attempt**: Direct Reddit API call
2. **403 Error**: Log the block, skip subreddit, continue with others
3. **429 Error**: Wait for retry-after period, then retry
4. **Other errors**: Exponential backoff retry up to 3 attempts
5. **Final failure**: Log error and move to next subreddit

### 📊 Monitoring
- Block events are logged to `subredditBlockLog` table
- Error details include status codes and messages
- Retry timestamps for future reference
- Success/failure metrics in Inngest dashboard

## Immediate Action Plan

### Step 1: Try Different Subreddits
Some subreddits may be less restricted:
```bash
# Test with these typically open subreddits
curl -H "User-Agent: OpportunityFinder/1.0.0" https://www.reddit.com/r/programming/hot.json
curl -H "User-Agent: OpportunityFinder/1.0.0" https://www.reddit.com/r/webdev/hot.json
```

### Step 2: Implement OAuth (Recommended)
```typescript
// Add to reddit.ts
interface RedditOAuthConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

class AuthenticatedRedditClient extends RedditClient {
  private accessToken?: string;
  
  constructor(private config: RedditOAuthConfig) {
    super();
  }
  
  async authenticate() {
    // Implement OAuth flow
  }
}
```

### Step 3: Add Alternative Sources
```typescript
// Add to functions.ts
async function fetchFromAlternativeSources(subreddit: string) {
  try {
    // Try Reddit first
    return await redditClient.fetchSubredditPosts(subreddit);
  } catch (error) {
    if (error.isBlocked) {
      // Try alternative sources
      return await fetchFromPushshift(subreddit);
    }
    throw error;
  }
}
```

## Testing Your Fix

### 1. Test Different Endpoints
```bash
# Test basic access
curl -H "User-Agent: OpportunityFinder/1.0.0" https://www.reddit.com/r/test/hot.json

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" https://oauth.reddit.com/r/entrepreneur/hot
```

### 2. Monitor Logs
```bash
# Check Inngest logs for error patterns
# Look for successful vs blocked subreddits
# Monitor retry behavior
```

### 3. Verify Error Handling
- Confirm blocked subreddits are skipped
- Verify other subreddits continue processing
- Check that block logs are created
- Ensure no infinite retry loops

## Long-term Recommendations

1. **Implement Reddit OAuth** for sustainable access
2. **Add multiple data sources** for redundancy
3. **Monitor Reddit API status** and adjust accordingly
4. **Cache successful data** to reduce API dependency
5. **Consider paid Reddit API access** for production use

## Support Resources

- [Reddit API Documentation](https://www.reddit.com/dev/api/)
- [Reddit App Registration](https://www.reddit.com/prefs/apps)
- [OAuth 2.0 Guide](https://github.com/reddit-archive/reddit/wiki/OAuth2)
- [Rate Limiting Info](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki)

## Contact Information

For Reddit API issues:
- Reddit Support: https://support.reddithelp.com/
- Reddit API Subreddit: r/redditdev
- Rate limit increases: Contact Reddit directly