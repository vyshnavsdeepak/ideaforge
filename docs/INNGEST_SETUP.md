# Inngest Setup Guide

## Overview

This application uses Inngest for background job processing and scheduled tasks. If you're seeing "Unable to reach SDK URL" errors, follow this guide to set it up properly.

## Local Development Setup

For local development, Inngest runs in development mode and doesn't require authentication keys.

1. **Start the Inngest Dev Server**:
   ```bash
   npx inngest-cli@latest dev
   ```
   This will start the Inngest Dev UI at http://localhost:8288

2. **Start your Next.js app**:
   ```bash
   npm run dev
   ```

3. **Register your app with Inngest Dev Server**:
   - Open http://localhost:8288
   - Your app should auto-register at http://localhost:3000/api/inngest

## Production Setup (Vercel)

For production deployments, you have two options:

### Option 1: Inngest Cloud (Recommended)

1. **Sign up for Inngest Cloud**:
   - Go to https://app.inngest.com
   - Create an account and a new app

2. **Get your keys**:
   - Event Key: Found in your app settings
   - Signing Key: Found in your app settings under "Signing Key"

3. **Add to Vercel Environment Variables**:
   ```
   INNGEST_EVENT_KEY=your-event-key
   INNGEST_SIGNING_KEY=your-signing-key
   ```

4. **Register your production endpoint**:
   - In Inngest Cloud, add your production URL: `https://your-app.vercel.app/api/inngest`

### Option 2: Self-Hosted Mode

If you don't want to use Inngest Cloud, you can run without authentication:

1. **Remove the environment variables** from Vercel
2. **The app will run in "local" mode** even in production

## Troubleshooting

### "Unable to reach SDK URL" Error

This error typically means:

1. **In development**: The Inngest dev server isn't running. Run `npx inngest-cli@latest dev`

2. **In production**: 
   - Check that your `/api/inngest` route is accessible
   - Verify environment variables are set correctly
   - Ensure your Vercel function timeout is sufficient (set in vercel.json)

### Testing the Connection

You can test if Inngest is properly configured by visiting:
- Development: http://localhost:3000/api/inngest
- Production: https://your-app.vercel.app/api/inngest

You should see a JSON response with function information.

## Environment Variables Reference

```env
# Optional - Only needed for Inngest Cloud
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

## Triggering Functions Manually

To trigger scraping manually:

```bash
# Development
curl -X POST http://localhost:3000/api/trigger-scraping

# Production
curl -X POST https://your-app.vercel.app/api/trigger-scraping
```

## Monitoring

- **Development**: Use the Inngest Dev UI at http://localhost:8288
- **Production with Inngest Cloud**: Use the dashboard at https://app.inngest.com
- **Self-hosted**: Check your application logs in Vercel