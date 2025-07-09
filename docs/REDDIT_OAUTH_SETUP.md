# Reddit OAuth Setup Guide

## Why Use Reddit OAuth?

Using Reddit's official OAuth API provides several benefits:
- **Higher rate limits**: 100 requests/minute vs 10 for unauthenticated
- **Access to private subreddits**: Some subreddits require authentication
- **Better reliability**: Less likely to be blocked or rate limited
- **Official support**: Reddit officially supports this approach

## Step 1: Create a Reddit App

### 1.1 Go to Reddit Apps
Visit: https://www.reddit.com/prefs/apps

### 1.2 Create New App
1. Click **"Create App"** or **"Create Another App"**
2. Fill out the form:
   - **Name**: `IdeaForge Opportunity Finder` (or your preferred name)
   - **App type**: Select **"script"** (for personal use)
   - **Description**: `Automated opportunity discovery from Reddit discussions`
   - **About URL**: Leave blank or add your website
   - **Redirect URI**: `http://localhost:8080/auth/callback` (required but not used)

### 1.3 Get Your Credentials
After creation, you'll see your app with:
- **Client ID**: The string under your app name (e.g., `abc123def456`)
- **Client Secret**: Click "edit" to reveal the secret (e.g., `xyz789uvw012`)

## Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Reddit OAuth Configuration
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
REDDIT_USER_AGENT=web:IdeaForge:v2.0.0 (by /u/your_reddit_username)
```

### Important Notes:
- **Username/Password**: These are YOUR Reddit account credentials
- **User Agent**: Must follow Reddit's format: `platform:AppName:version (by /u/username)`
- **Keep secure**: Never commit these to version control
- **Use dedicated account**: Consider creating a dedicated Reddit account for scraping

## Step 3: Test Your Setup

### 3.1 Run TypeScript Check
```bash
npm run typecheck
```

### 3.2 Test Authentication
Create a test script or check the logs when running scraping:

```bash
# Start your app and check logs
npm run dev

# In another terminal, trigger scraping
curl -X POST http://localhost:3000/api/trigger-scraping
```

Look for these log messages:
```
[REDDIT] Using authenticated Reddit client
[REDDIT_AUTH] Authenticating with Reddit OAuth...
[REDDIT_AUTH] Successfully authenticated with Reddit
[REDDIT_AUTH] Authenticated as: yourusername
```

## Step 4: Verify Higher Rate Limits

With authentication, you should see:
- **100 requests/minute** instead of 10
- Access to previously blocked subreddits
- More stable scraping performance

## Example Environment File

```env
# Reddit OAuth (Required for reliable scraping)
REDDIT_CLIENT_ID=abc123def456
REDDIT_CLIENT_SECRET=xyz789uvw012mno345
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
REDDIT_USER_AGENT=web:IdeaForge:v2.0.0 (by /u/your_reddit_username)

# Other existing variables...
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_nextauth_secret
# ... etc
```

## Security Best Practices

### 1. Account Security
- **Enable 2FA**: Use two-factor authentication on your Reddit account
- **Strong password**: Use a unique, strong password
- **Monitor activity**: Check your Reddit account regularly for unusual activity

### 2. App Security
- **Limit scope**: The "script" app type has minimal permissions
- **Rotate credentials**: Consider rotating your Reddit password periodically
- **Monitor usage**: Check Reddit's rate limit headers in responses

### 3. Code Security
- **Environment variables**: Never hardcode credentials
- **Git ignore**: Ensure `.env.local` is in `.gitignore`
- **Access control**: Limit who has access to production environment variables

### 4. User Agent Best Practices
- **Format**: Always use `platform:AppName:version (by /u/username)` format
- **Descriptive**: Use a clear, descriptive app name
- **Contact info**: Include your Reddit username for contact
- **Version tracking**: Update version when making significant changes
- **Examples**:
  - `web:IdeaForge:v2.0.0 (by /u/yourusername)`
  - `web:OpportunityFinder:v1.5.0 (by /u/yourusername)`

## Troubleshooting

### Error: "Invalid client credentials"
- Verify `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are correct
- Make sure there are no extra spaces in your environment variables
- Try regenerating the client secret

### Error: "Invalid username/password"
- Check `REDDIT_USERNAME` and `REDDIT_PASSWORD`
- Try logging into Reddit manually with these credentials
- Ensure 2FA is not blocking programmatic access

### Error: "403 Forbidden" still occurring
- Wait a few minutes after setting up credentials
- Check that your Reddit account is not suspended or limited
- Verify the app type is set to "script"

### Rate limiting still occurring
- Authenticated requests should show different rate limits
- Check response headers for `X-Ratelimit-*` headers
- Monitor console logs for authentication success messages

## Fallback Behavior

The application is designed to work with or without authentication:

- **With auth**: Uses OAuth, higher rate limits, better access
- **Without auth**: Falls back to unauthenticated requests with blocks/limits

This ensures your app continues working while you set up authentication.

## Reddit API Documentation

- [Reddit API Documentation](https://www.reddit.com/dev/api/)
- [OAuth 2.0 Guide](https://github.com/reddit-archive/reddit/wiki/OAuth2)
- [Rate Limiting](https://support.reddithelp.com/hc/en-us/articles/16160319875092)
- [App Types](https://www.reddit.com/wiki/api#wiki_app_types)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Test with a simple Reddit API call
4. Check Reddit API status at https://www.redditstatus.com/