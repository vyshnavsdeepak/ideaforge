# Reddit Scraping Schedule Configuration

This document outlines the automated Reddit scraping schedule optimized for maximum opportunity discovery.

## 🕐 Scheduling Overview

Based on Reddit usage patterns and content quality analysis, we've implemented multiple scraping strategies:

### Peak Activity Window (9 AM - 1 PM EST)
- **Frequency**: Every 30 minutes
- **Target**: High-engagement, trending content
- **Subreddits**: Priority subreddits (entrepreneur, startups, smallbusiness, business, SaaS)
- **Limit**: 50 posts per subreddit
- **Cron**: `0,30 9-13 * * *`

### Daily Comprehensive Scraping (2 PM EST)
- **Frequency**: Once daily
- **Target**: Complete subreddit coverage after global content accumulation
- **Subreddits**: All target subreddits
- **Limit**: 100 posts per subreddit
- **Cron**: `0 14 * * *`

### Real-time Hot Content (Every 10 minutes)
- **Frequency**: Every 10 minutes
- **Target**: Fast-moving hot posts
- **Subreddits**: Core business subreddits
- **Limit**: 25 posts per subreddit
- **Cron**: `*/10 * * * *`

### Weekend Opportunity Discovery (Saturday 10 AM EST)
- **Frequency**: Weekly
- **Target**: Weekend project discussions and side hustle opportunities
- **Subreddits**: Entrepreneur-focused subreddits
- **Limit**: 75 posts per subreddit
- **Cron**: `0 10 * * 6`

### Development Mode (Every 2 hours)
- **Frequency**: Every 2 hours
- **Target**: Testing and development
- **Condition**: Only runs when `NODE_ENV !== 'production'`
- **Limit**: 10 posts per subreddit
- **Cron**: `0 */2 * * *`

## 🎯 Optimization Rationale

### Peak Hours (9 AM - 1 PM EST)
- US time zones dominate Reddit traffic
- Maximum user engagement and voting activity
- Best opportunity for trending content discovery
- Higher post quality due to increased community interaction

### Daily Comprehensive (2 PM EST)
- Allows global content to accumulate overnight
- Captures international perspectives and discussions
- Ensures comprehensive coverage of all target subreddits
- Optimal for knowledge base building

### Real-time Monitoring
- Catches breaking discussions and viral content
- Enables rapid response to emerging opportunities
- Focuses on "hot" posts with high engagement velocity

### Weekend Discovery
- Captures weekend project discussions
- Side hustle and entrepreneurship planning content
- Different content patterns compared to weekdays

## 📊 Content Filtering

All scheduled scraping applies these filters:
- Minimum 5 upvotes and 3 comments
- Excludes stickied, locked, or NSFW posts
- Filters out megathreads and announcements
- Prioritizes self-posts with substantial content

## 🔄 Priority System

- **High**: Peak activity scraping
- **Normal**: Daily comprehensive scraping
- **Realtime**: Hot content monitoring
- **Weekend**: Weekend opportunity discovery
- **Dev**: Development mode scraping

## 🚀 Getting Started

1. **Production**: All schedules run automatically
2. **Development**: Only dev-mode scraper runs (every 2 hours)
3. **Manual Trigger**: Use the dashboard trigger button for immediate scraping

## 📈 Monitoring

Monitor scraping performance through:
- Inngest dashboard for job execution
- Application logs for scraping statistics
- Opportunities dashboard for discovery metrics

## ⚙️ Configuration

Environment variables:
- `NODE_ENV`: Controls dev vs production scheduling
- `INNGEST_*`: Inngest configuration for job execution
- `REDDIT_*`: Reddit API credentials (if using authenticated API)

## 🔧 Customization

To modify schedules:
1. Edit cron expressions in `/src/inngest/scheduled-jobs.ts`
2. Adjust subreddit priorities and limits
3. Update filtering criteria in `/src/lib/reddit.ts`
4. Restart the application to apply changes