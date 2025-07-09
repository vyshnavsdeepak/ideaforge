# Inngest Guide for IdeaForge

## What is Inngest?

Inngest is a serverless workflow orchestration platform that makes it easy to build reliable, distributed applications using events and functions. In our IdeaForge project, we use Inngest to handle complex, multi-step background jobs like Reddit scraping and AI analysis.

## Key Concepts

### 1. Events
Events are triggers that start workflows. They contain data and metadata.

```typescript
// Sending an event
await inngest.send({
  name: "reddit/scrape.subreddit",
  data: { 
    subreddit: "entrepreneur",
    limit: 50,
    priority: 'high'
  }
});
```

### 2. Functions
Functions are serverless handlers that respond to events. They can be simple or contain multiple steps.

```typescript
// Basic function structure
export const myFunction = inngest.createFunction(
  { id: "unique-function-id" },
  { event: "my/event.name" },
  async ({ event, step }) => {
    // Function logic here
    return { result: "success" };
  }
);
```

### 3. Steps
Steps are the building blocks within functions that provide reliability, retries, and observability.

```typescript
// Step example
await step.run("step-name", async () => {
  // This code runs with automatic retries
  return await someAsyncOperation();
});
```

## Inngest Architecture in Our Project

### File Structure
```
src/
├── lib/inngest.ts          # Inngest client configuration
├── inngest/
│   ├── functions.ts        # Main business logic functions
│   └── scheduled-jobs.ts   # Cron-scheduled functions
└── app/api/inngest/route.ts # Next.js API route for Inngest
```

### Configuration (`src/lib/inngest.ts`)
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({ 
  id: "ideaforge",
  eventKey: process.env.INNGEST_EVENT_KEY 
});
```

## Function Patterns in Our Project

### 1. Reddit Scraping Functions

**Event Pattern**: `reddit/scrape.subreddit`
```typescript
export const scrapeSubredditFunction = inngest.createFunction(
  { id: "scrape-subreddit" },
  { event: "reddit/scrape.subreddit" },
  async ({ event, step }) => {
    // Multi-step scraping process
    const cursor = await step.run("get-cursor", async () => {
      return await getSubredditCursor(event.data.subreddit);
    });

    const posts = await step.run("fetch-posts", async () => {
      return await fetchRedditPosts(event.data.subreddit, cursor);
    });

    const stored = await step.run("store-posts", async () => {
      return await storeRedditPosts(posts);
    });

    return { postsStored: stored.length };
  }
);
```

### 2. AI Analysis Functions

**Event Pattern**: `ai/batch-analyze.opportunities`
```typescript
export const batchAnalyzeOpportunitiesFunction = inngest.createFunction(
  { id: "batch-analyze-opportunities" },
  { event: "ai/batch-analyze.opportunities" },
  async ({ event, step }) => {
    // 5-step AI analysis process with detailed outputs
    const enrichedPosts = await step.run("enrich-posts", async () => {
      // Enrich post data
    });

    const batchRequests = await step.run("prepare-batch", async () => {
      // Prepare AI batch requests
    });

    const batchResponse = await step.run("ai-analysis", async () => {
      // Call AI API with batch processing
    });

    const stored = await step.run("store-results", async () => {
      // Store analysis results
    });

    const cleanup = await step.run("cleanup", async () => {
      // Mark posts as processed
    });

    return {
      processed: batchResponse.results.length,
      totalCost: batchResponse.totalCost
    };
  }
);
```

### 3. Scheduled Jobs (Cron Functions)

**File**: `src/inngest/scheduled-jobs.ts`

```typescript
// Peak activity scraping (every 30 minutes during peak hours)
export const peakActivityScraper = inngest.createFunction(
  { id: "peak-activity-scraper" },
  { cron: "0,30 9-13 * * *" }, // Cron schedule
  async ({ step }) => {
    await step.run("trigger-priority-scraping", async () => {
      for (const subreddit of prioritySubreddits) {
        await inngest.send({
          name: "reddit/scrape.subreddit",
          data: { subreddit, limit: 50, priority: 'high' }
        });
      }
    });
  }
);
```

## Step Types and When to Use Them

### 1. `step.run()` - Basic Step
Use for any operation that should be retried on failure.

```typescript
const result = await step.run("operation-name", async () => {
  return await someOperation();
});
```

### 2. `step.sleep()` - Delays
Use to add delays between operations.

```typescript
await step.sleep("wait-for-rate-limit", "30s");
```

### 3. `step.sendEvent()` - Send Events from Steps
Use to trigger other functions from within a step.

```typescript
await step.sendEvent("trigger-analysis", {
  name: "ai/batch-analyze.opportunities",
  data: { posts: [...] }
});
```

### 4. `step.waitForEvent()` - Wait for Events
Use to pause execution until another event occurs.

```typescript
const result = await step.waitForEvent("wait-for-completion", {
  event: "analysis/completed",
  timeout: "10m"
});
```

## Error Handling and Retries

### Automatic Retries
All steps automatically retry on failure with exponential backoff.

```typescript
await step.run("operation-with-retries", async () => {
  // This will retry automatically on failure
  const result = await unstableAPICall();
  return result;
});
```

### Manual Error Handling
```typescript
await step.run("safe-operation", async () => {
  try {
    return await riskyOperation();
  } catch (error) {
    console.error("Operation failed:", error);
    throw error; // Re-throw to trigger retry
  }
});
```

### Conditional Retries
```typescript
await step.run("conditional-retry", async () => {
  try {
    return await apiCall();
  } catch (error) {
    if (error.status === 429) {
      // Rate limit - should retry
      throw error;
    }
    // Other errors - don't retry
    return { error: error.message };
  }
});
```

## Event Naming Conventions

We follow a hierarchical naming pattern:

- `reddit/scrape.subreddit` - Reddit scraping events
- `ai/batch-analyze.opportunities` - AI analysis events
- `ai/process.unprocessed` - Manual processing events
- `system/health.check` - System monitoring events

## Best Practices for Our Project

### 1. Descriptive Step Names
```typescript
// Good - describes what the step does
await step.run("fetch-reddit-posts-with-cursor", async () => {
  return await fetchPosts(subreddit, cursor);
});

// Bad - generic name
await step.run("step-1", async () => {
  return await fetchPosts(subreddit, cursor);
});
```

### 2. Detailed Logging
```typescript
await step.run("ai-batch-analysis", async () => {
  console.log(`[BATCH_AI] Starting analysis for ${posts.length} posts`);
  const result = await batchAnalyzeOpportunities(posts);
  console.log(`[BATCH_AI] Completed with ${result.results.length} results, cost: $${result.totalCost}`);
  return result;
});
```

### 3. Cost Tracking Integration
```typescript
await step.run("ai-analysis-with-cost-tracking", async () => {
  const sessionId = await startAISession();
  try {
    const result = await aiOperation();
    await recordAIUsage(sessionId, result.usage);
    return result;
  } catch (error) {
    await recordAIError(sessionId, error);
    throw error;
  }
});
```

### 4. Batch Processing Patterns
```typescript
// Process in efficient batches
const batchSize = 25;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await step.run(`process-batch-${Math.floor(i / batchSize) + 1}`, async () => {
    return await processBatch(batch);
  });
}
```

## Common Patterns in Our Codebase

### 1. Manual Trigger Pattern
Used in admin endpoints to manually trigger processing:

```typescript
// API Route
export async function POST() {
  await inngest.send({
    name: "ai/process.unprocessed",
    data: { triggeredBy: "manual-admin-trigger" }
  });
}
```

### 2. Scheduled Processing Pattern
Used for regular background jobs:

```typescript
export const scheduledProcessor = inngest.createFunction(
  { id: "scheduled-processor" },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    const items = await step.run("find-items", findUnprocessedItems);
    if (items.length > 0) {
      await step.run("process-items", () => processItems(items));
    }
  }
);
```

### 3. Mixed Batch Processing
Processes items from different sources together:

```typescript
await inngest.send({
  name: "ai/batch-analyze.opportunities",
  data: {
    subreddit: "mixed", // Indicates mixed sources
    posts: mixedPosts,
    batchInfo: {
      isMixedSubreddits: true,
      totalPosts: mixedPosts.length
    }
  }
});
```

## Debugging and Monitoring

### 1. Console Logging
Always include detailed logs with consistent prefixes:

```typescript
console.log(`[FUNCTION_NAME] Starting operation with ${data.length} items`);
console.log(`[FUNCTION_NAME] Completed operation, processed ${results.length} items`);
```

### 2. Step Outputs
Return meaningful data from steps for visibility:

```typescript
await step.run("operation", async () => {
  const result = await operation();
  return {
    processed: result.length,
    timestamp: new Date().toISOString(),
    details: result.map(r => ({ id: r.id, status: r.status }))
  };
});
```

### 3. Error Context
Provide context in error messages:

```typescript
try {
  return await operation();
} catch (error) {
  console.error(`[FUNCTION] Operation failed for ${context}:`, error);
  throw new Error(`Operation failed for ${context}: ${error.message}`);
}
```

## Function Registration

All functions must be registered in the API route:

```typescript
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest";
import { 
  scrapeSubredditFunction,
  batchAnalyzeOpportunitiesFunction,
  processUnprocessedPosts
} from "../../../inngest/functions";
import {
  peakActivityScraper,
  dailyComprehensiveScraper,
  batchAIProcessor
} from "../../../inngest/scheduled-jobs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Main functions
    scrapeSubredditFunction,
    batchAnalyzeOpportunitiesFunction,
    processUnprocessedPosts,
    
    // Scheduled jobs
    peakActivityScraper,
    dailyComprehensiveScraper,
    batchAIProcessor,
  ],
});
```

This guide covers the essential patterns and practices for working with Inngest in our IdeaForge project. For more advanced features, refer to the official Inngest documentation.