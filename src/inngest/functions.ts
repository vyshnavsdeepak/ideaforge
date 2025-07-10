import { NonRetriableError } from "inngest";
import { createRedditClient, RedditAPIError, getActiveSubreddits, redditUserScraper } from "@/reddit";
import { Delta4Analyzer, batchAnalyzeOpportunities, BatchAnalysisRequest, processBatchResults } from "@/ai";
import { clusteringEngine } from "@/opportunities";
import { prisma } from "@/shared/services/prisma";
import { inngest } from "@/shared/services/inngest";
import { checkRedditPostDuplication, checkOpportunityDuplication, updateRedditPost } from "@/shared/services/deduplication";
import { Prisma } from "@prisma/client";

export const scrapeSubreddit = inngest.createFunction(
  { 
    id: "scrape-subreddit",
    retries: 3,
    rateLimit: {
      limit: 100,
      period: "1m"
    }
  },
  { event: "reddit/scrape.subreddit" },
  async ({ event, step }) => {
    const { subreddit, limit = 25, sort = 'hot', priority = 'normal', historical = false } = event.data;
    console.log(`[SCRAPE] Starting scrape for r/${subreddit} with limit ${limit}, sort ${sort}, priority ${priority}, historical: ${historical}`);

    // Get the cursor for this subreddit (skip for historical recovery)
    const cursor = await step.run("get-subreddit-cursor", async () => {
      if (historical) {
        console.log(`[SCRAPE] Historical recovery mode - bypassing cursor for r/${subreddit}`);
        return {
          hasCursor: false,
          lastRedditId: null,
          lastCreatedUtc: null,
          postsProcessed: 0,
          cursor: null
        };
      }
      
      const existingCursor = await prisma.subredditCursor.findUnique({
        where: { subreddit }
      });
      console.log(`[SCRAPE] Cursor for r/${subreddit}:`, existingCursor ? 
        `Last ID: ${existingCursor.lastRedditId}, Last time: ${existingCursor.lastCreatedUtc}` : 
        'No cursor found (first scrape)');
      return {
        hasCursor: !!existingCursor,
        lastRedditId: existingCursor?.lastRedditId || null,
        lastCreatedUtc: existingCursor?.lastCreatedUtc || null,
        postsProcessed: existingCursor?.postsProcessed || 0,
        cursor: existingCursor
      };
    });

    const posts = await step.run("fetch-reddit-posts", async () => {
      if (historical) {
        console.log(`[SCRAPE] HISTORICAL RECOVERY: Fetching ${sort} posts from r/${subreddit} (limit: ${limit}) - BYPASSING CURSOR`);
      } else {
        console.log(`[SCRAPE] Fetching ${sort} posts from r/${subreddit}`);
      }
      const client = createRedditClient();
      
      try {
        const allPosts = await client.fetchSubredditPosts(subreddit, sort, limit);
        
        // If we have a cursor, filter out posts we've already seen (skipped for historical recovery)
        if (cursor.hasCursor && cursor.cursor && !historical) {
          const cursorTime = new Date(cursor.cursor.lastCreatedUtc).getTime();
          const beforeCount = allPosts.length;
          
          // Sort posts by created time (newest first)
          allPosts.sort((a, b) => b.createdUtc.getTime() - a.createdUtc.getTime());
          
          // Find where to stop based on cursor
          const newPosts = [];
          for (const post of allPosts) {
            if (!post) continue; // Skip null posts
            
            // Stop if we've reached a post older than our cursor
            if (post.createdUtc.getTime() <= cursorTime) {
              console.log(`[SCRAPE] Reached cursor boundary at post ${post.redditId}`);
              break;
            }
            // Also check if we've seen this exact post ID
            if (post.redditId === cursor.cursor.lastRedditId) {
              console.log(`[SCRAPE] Found exact cursor post ${post.redditId}`);
              break;
            }
            newPosts.push(post);
          }
          
          console.log(`[SCRAPE] Filtered ${beforeCount} posts to ${newPosts.length} new posts using cursor`);
          return {
            posts: newPosts,
            totalFetched: beforeCount,
            filtered: beforeCount - newPosts.length,
            usedCursor: true,
            cursorTime: cursor.cursor.lastCreatedUtc,
            error: null
          };
        }
        
        if (historical) {
          console.log(`[SCRAPE] HISTORICAL RECOVERY: Fetched ${allPosts.length} posts from r/${subreddit} (no cursor filtering)`);
        } else {
          console.log(`[SCRAPE] Fetched ${allPosts.length} posts from r/${subreddit} (no cursor)`);
        }
        return {
          posts: allPosts,
          totalFetched: allPosts.length,
          filtered: 0,
          usedCursor: false,
          cursorTime: null,
          error: null,
          historical: historical
        };
        
      } catch (error) {
        const redditError = error as RedditAPIError;
        
        console.error(`[SCRAPE] Error fetching r/${subreddit}:`, redditError.message);
        
        // Handle different types of errors
        if (redditError.isBlocked) {
          console.warn(`[SCRAPE] Access blocked to r/${subreddit}. Skipping this subreddit.`);
          
          // Log the block for monitoring
          console.log(`[SCRAPE] BLOCKED: r/${subreddit} - Status: ${redditError.status || 403}, Message: ${redditError.message}`);
          console.log(`[SCRAPE] Will retry r/${subreddit} in 24 hours`);
          
          return {
            posts: [],
            totalFetched: 0,
            filtered: 0,
            usedCursor: false,
            error: 'blocked',
            message: 'Subreddit access blocked'
          };
        }
        
        if (redditError.isRateLimited) {
          console.warn(`[SCRAPE] Rate limited for r/${subreddit}. Will retry later.`);
          // For rate limits, let Inngest handle the retry with its built-in mechanisms
          throw error;
        }
        
        // For other errors, also retry but with logging
        console.error(`[SCRAPE] Unexpected error for r/${subreddit}:`, redditError.message);
        throw error;
      }
    });

    const storedPosts = await step.run("store-reddit-posts", async () => {
      console.log(`[SCRAPE] Processing ${posts.posts.length} posts for storage with enhanced deduplication`);
      const newPosts = [];
      const updatedPosts = [];
      const skippedPosts = [];
      
      for (const post of posts.posts) {
        if (!post) {
          console.warn(`[SCRAPE] Encountered null post, skipping`);
          continue;
        }
        
        console.log(`[SCRAPE] Checking post ${post.redditId}: ${post.title.substring(0, 50)}...`);
        
        // Enhanced deduplication check
        const duplicationResult = await checkRedditPostDuplication(
          post.redditId,
          post.title,
          post.content || '',
          post.subreddit,
          post.author
        );
        
        if (duplicationResult.isDuplicate) {
          console.log(`[SCRAPE] Post ${post.redditId} is duplicate: ${duplicationResult.reason}`);
          
          // If it's an exact Reddit ID match, update the existing post with new data
          if (duplicationResult.reason === 'Exact Reddit ID match') {
            try {
              await updateRedditPost(post.redditId, {
                score: post.score,
                upvotes: post.upvotes,
                downvotes: post.downvotes,
                numComments: post.numComments
              });
              updatedPosts.push(post.redditId);
              console.log(`[SCRAPE] Updated existing post ${post.redditId} with new scores`);
            } catch (error) {
              console.error(`[SCRAPE] Error updating post ${post.redditId}:`, error);
            }
          } else {
            skippedPosts.push({
              redditId: post.redditId,
              reason: duplicationResult.reason,
              similarity: duplicationResult.similarityScore
            });
          }
        } else {
          // Post is not a duplicate, store it
          console.log(`[SCRAPE] Storing new post: ${post.title.substring(0, 50)}...`);
          try {
            const stored = await prisma.redditPost.create({
              data: {
                redditId: post.redditId,
                title: post.title,
                content: post.content,
                subreddit: post.subreddit,
                author: post.author,
                score: post.score,
                upvotes: post.upvotes,
                downvotes: post.downvotes,
                numComments: post.numComments,
                url: post.url,
                permalink: post.permalink,
                createdUtc: post.createdUtc,
              }
            });
            newPosts.push(stored);
          } catch (error) {
            console.error(`[SCRAPE] Error storing post ${post.redditId}:`, error);
          }
        }
      }
      
      console.log(`[SCRAPE] Results: ${newPosts.length} new posts, ${updatedPosts.length} updated, ${skippedPosts.length} skipped`);
      if (skippedPosts.length > 0) {
        console.log(`[SCRAPE] Skipped reasons:`, skippedPosts.map(p => p.reason));
      }
      
      return {
        newPosts,
        totalProcessed: posts.posts.length,
        newPostsCount: newPosts.length,
        updatedPostsCount: updatedPosts.length,
        skippedPostsCount: skippedPosts.length,
        skippedReasons: skippedPosts.slice(0, 5).map(p => p.reason),
        duplicateTypes: [...new Set(skippedPosts.map(p => p.reason))]
      };
    });

    // Queue posts for later batch processing - no immediate AI processing
    const aiProcessingResult = storedPosts.newPostsCount > 0 ? {
        aiTriggered: false,
        postsQueued: storedPosts.newPostsCount,
        reason: `${storedPosts.newPostsCount} posts queued for batch processing`,
        queuedForBatchProcessing: true
      } : {
        aiTriggered: false,
        postsQueued: 0,
        reason: 'No new posts to process'
      };

    // Update cursor if we processed any posts (skip for historical recovery)
    const cursorUpdateResult = posts.posts.length > 0 && !historical ? await step.run("update-subreddit-cursor", async () => {
      // Find the newest post we processed
      const validPosts = posts.posts.filter(post => post !== null);
      if (validPosts.length === 0) {
        throw new Error("No valid posts to update cursor");
      }
      
      const newestPost = validPosts.reduce((newest, post) => 
        new Date(post!.createdUtc).getTime() > new Date(newest!.createdUtc).getTime() ? post : newest
      , validPosts[0]);
      
      console.log(`[SCRAPE] Updating cursor for r/${subreddit} to post ${newestPost!.redditId} at ${newestPost!.createdUtc}`);
      
      const cursorData = await prisma.subredditCursor.upsert({
        where: { subreddit },
        update: {
          lastRedditId: newestPost!.redditId,
          lastCreatedUtc: newestPost!.createdUtc,
          postsProcessed: { increment: posts.posts.length },
          updatedAt: new Date()
        },
        create: {
          subreddit,
          lastRedditId: newestPost!.redditId,
          lastCreatedUtc: newestPost!.createdUtc,
          postsProcessed: posts.posts.length
        }
      });
      
      const updateResult = {
        subreddit,
        previousCursor: cursorData.lastRedditId,
        newCursor: newestPost!.redditId,
        newCursorDate: newestPost!.createdUtc,
        postsProcessedThisRun: posts.posts.length,
        totalPostsProcessed: cursorData.postsProcessed,
        cursorAdvancedBy: posts.posts.length,
        oldestPostInBatch: validPosts[validPosts.length - 1]?.redditId,
        newestPostInBatch: newestPost!.redditId,
      };
      
      console.log(`[SCRAPE] Cursor update completed:`, updateResult);
      return updateResult;
    }) : { 
      subreddit, 
      skipped: true, 
      reason: historical ? 'Historical recovery - cursor not updated' : 'No posts processed',
      postsReceived: posts.posts?.length || 0,
      wasBlocked: posts.error === 'blocked',
      historical: historical
    };

    const result = { 
      subreddit, 
      fetchResult: {
        totalFetched: posts.totalFetched,
        filtered: posts.filtered,
        usedCursor: posts.usedCursor,
        wasBlocked: posts.error === 'blocked'
      },
      storageResult: {
        totalProcessed: storedPosts.totalProcessed,
        newPosts: storedPosts.newPostsCount,
        updated: storedPosts.updatedPostsCount,
        skipped: storedPosts.skippedPostsCount,
        duplicateTypes: storedPosts.duplicateTypes
      },
      aiProcessingResult,
      cursorUpdate: cursorUpdateResult,
    };
    console.log(`[SCRAPE] Completed scrape:`, result);
    return result;
  }
);

export const analyzeOpportunity = inngest.createFunction(
  { 
    id: "analyze-opportunity",
    retries: 3, // Reduced from 5 to avoid excessive retries
    rateLimit: {
      limit: 15,
      period: "1m"
    }
  },
  { event: "ai/analyze.opportunity" },
  async ({ event, step }) => {
    const { postId, postTitle, postContent, subreddit, author, score, numComments } = event.data;
    console.log(`[AI] Starting analysis for post ${postId}: ${postTitle.substring(0, 50)}...`);

    const analysis = await step.run("ai-analysis", async () => {
      console.log(`[AI] Checking Google AI API key...`);
      const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!googleApiKey) {
        console.error(`[AI] Google AI API key not configured`);
        throw new NonRetriableError("Google AI API key not configured");
      }
      console.log(`[AI] Google AI API key found, creating analyzer...`);

      const analyzer = new Delta4Analyzer(googleApiKey);
      console.log(`[AI] Starting AI analysis for post: ${postTitle.substring(0, 50)}...`);
      console.log(`[AI] Post content length: ${postContent?.length || 0} characters`);
      
      try {
        const result = await analyzer.analyzeOpportunity({
          postTitle,
          postContent,
          subreddit,
          author,
          score,
          numComments,
        }, {
          trackCosts: true,
          redditPostId: postId,
          sessionData: {
            sessionId: event.id || `individual_${postId}`,
            sessionType: 'individual',
            triggeredBy: 'inngest-individual',
            subreddit,
            postsRequested: 1,
          },
        });
        
        console.log(`[AI] Analysis completed. Is opportunity: ${result.isOpportunity}`);
        return result;
      } catch (error: unknown) {
        console.error(`[AI] Analysis failed:`, error);
        
        // Check if it's a quota/rate limit error
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 0;
        
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || statusCode === 429) {
          console.log(`[AI] Quota/rate limit error detected, will retry with backoff`);
          // Throw the error to trigger Inngest's retry mechanism
          throw error;
        }
        
        // For other errors, don't retry
        throw error;
      }
    });

    if (analysis && analysis.isOpportunity && analysis.opportunity) {
      const opportunity = await step.run("store-opportunity", async () => {
        const opp = analysis.opportunity!;
        
        console.log(`[AI] Checking for duplicate opportunities: ${opp.title}`);
        
        // Check for duplicate opportunities
        const duplicationResult = await checkOpportunityDuplication(
          opp.title,
          opp.description,
          opp.proposedSolution,
          opp.categories.niche
        );
        
        if (duplicationResult.isDuplicate && duplicationResult.existingId) {
          console.log(`[AI] Found similar opportunity: ${duplicationResult.reason}`);
          if (duplicationResult.similarityScore) {
            console.log(`[AI] Similarity score: ${duplicationResult.similarityScore.toFixed(2)}`);
          }
          
          // Link this post as another source for the existing opportunity
          console.log(`[AI] Adding post ${postId} as additional source for opportunity ${duplicationResult.existingId}`);
          
          // Create the source link
          await prisma.opportunitySource.create({
            data: {
              opportunityId: duplicationResult.existingId,
              redditPostId: postId,
              sourceType: 'post',
              confidence: analysis.confidence || 0.9,
            }
          });
          
          // Increment source count
          const updatedOpportunity = await prisma.opportunity.update({
            where: { id: duplicationResult.existingId },
            data: { 
              sourceCount: { increment: 1 },
              // Update scores if this new analysis has higher confidence
              ...(analysis.confidence > 0.95 ? {
                overallScore: opp.overallScore,
                viabilityThreshold: opp.viabilityThreshold,
              } : {})
            }
          });
          
          console.log(`[AI] Opportunity now has ${updatedOpportunity.sourceCount} sources`);
          return updatedOpportunity;
        }
        
        console.log(`[AI] Creating new opportunity: ${opp.title}`);
        return await prisma.opportunity.create({
          data: {
            title: opp.title,
            description: opp.description,
            currentSolution: opp.currentSolution,
            proposedSolution: opp.proposedSolution,
            marketContext: opp.marketContext,
            implementationNotes: opp.implementationNotes,
            
            speedScore: opp.delta4Scores.speed,
            convenienceScore: opp.delta4Scores.convenience,
            trustScore: opp.delta4Scores.trust,
            priceScore: opp.delta4Scores.price,
            statusScore: opp.delta4Scores.status,
            predictabilityScore: opp.delta4Scores.predictability,
            uiUxScore: opp.delta4Scores.uiUx,
            easeOfUseScore: opp.delta4Scores.easeOfUse,
            legalFrictionScore: opp.delta4Scores.legalFriction,
            emotionalComfortScore: opp.delta4Scores.emotionalComfort,
            
            overallScore: opp.overallScore,
            viabilityThreshold: opp.viabilityThreshold,
            
            subreddit,
            marketSize: opp.marketSize,
            complexity: opp.complexity,
            successProbability: opp.successProbability,
            
            // New categorization fields
            businessType: opp.categories.businessType,
            businessModel: opp.categories.businessModel,
            revenueModel: opp.categories.revenueModel,
            pricingModel: opp.categories.pricingModel,
            platform: opp.categories.platform,
            mobileSupport: opp.categories.mobileSupport,
            deploymentType: opp.categories.deploymentType,
            developmentType: opp.categories.developmentType,
            targetAudience: opp.categories.targetAudience,
            userType: opp.categories.userType,
            technicalLevel: opp.categories.technicalLevel,
            ageGroup: opp.categories.ageGroup,
            geography: opp.categories.geography,
            marketType: opp.categories.marketType,
            economicLevel: opp.categories.economicLevel,
            industryVertical: opp.categories.industryVertical,
            niche: opp.categories.niche,
            developmentComplexity: opp.categories.developmentComplexity,
            teamSize: opp.categories.teamSize,
            capitalRequirement: opp.categories.capitalRequirement,
            developmentTime: opp.categories.developmentTime,
            marketSizeCategory: opp.categories.marketSizeCategory,
            competitionLevel: opp.categories.competitionLevel,
            marketTrend: opp.categories.marketTrend,
            growthPotential: opp.categories.growthPotential,
            acquisitionStrategy: opp.categories.acquisitionStrategy,
            scalabilityType: opp.categories.scalabilityType,
            
            // Market Validation Fields
            marketValidationScore: opp.marketValidation.marketValidationScore,
            engagementLevel: opp.marketValidation.engagementLevel,
            problemFrequency: opp.marketValidation.problemFrequency,
            customerType: opp.marketValidation.customerType,
            paymentWillingness: opp.marketValidation.paymentWillingness,
            competitiveAnalysis: opp.marketValidation.competitiveAnalysis,
            validationTier: opp.marketValidation.validationTier,
            
            // Create initial source link
            redditPosts: {
              create: {
                redditPostId: postId,
                sourceType: 'post',
                confidence: analysis.confidence || 0.9,
              }
            }
          }
        });
      });

      await step.run("mark-post-processed", async () => {
        await prisma.redditPost.update({
          where: { id: postId },
          data: { 
            processedAt: new Date(),
            isOpportunity: true,
            aiConfidence: analysis.confidence || 0.9,
            aiAnalysisDate: new Date()
          }
        });
      });

      // Extract and process demand signals
      await step.run("extract-demand-signals", async () => {
        const signals = await clusteringEngine.extractDemandSignals(
          postTitle,
          postContent,
          subreddit,
          postId,
          author,
          score
        );

        console.log(`[AI] Extracted ${signals.length} demand signals from post`);

        // Process each signal
        for (const signal of signals) {
          try {
            const result = await clusteringEngine.processNewSignal(signal);
            console.log(`[AI] Processed demand signal: ${result.isNewCluster ? 'New cluster' : 'Added to existing cluster'}`);
          } catch (error) {
            console.error(`[AI] Error processing demand signal:`, error);
          }
        }
      });

      return { 
        success: true, 
        opportunityId: opportunity.id,
        overallScore: analysis.opportunity?.overallScore || 0,
        viable: analysis.opportunity?.viabilityThreshold || false
      };
    }

    await step.run("mark-post-processed-as-rejected", async () => {
      await prisma.redditPost.update({
        where: { id: postId },
        data: { 
          processedAt: new Date(),
          isOpportunity: false,
          rejectionReasons: analysis?.reasons || ["No opportunity identified"],
          aiConfidence: analysis?.confidence || 0.0,
          aiAnalysisDate: new Date()
        }
      });
    });

    return { 
      success: false, 
      reason: analysis?.reasons?.[0] || "No opportunity identified" 
    };
  }
);

export const dailyMarketDemandAnalysis = inngest.createFunction(
  { 
    id: "daily-market-demand-analysis",
    concurrency: {
      limit: 1
    }
  },
  { cron: "0 10 * * *" }, // Run at 10 AM UTC daily
  async ({ step }) => {
    const results = await step.run("trigger-market-demand-analysis", async () => {
      console.log(`[DAILY_MARKET_DEMAND] Triggering daily market demand analysis`);
      
      const event = await inngest.send({
        name: "market/analyze.demands",
        data: {
          triggeredBy: "scheduled",
          timestamp: new Date().toISOString(),
        }
      });
      
      return { 
        analysisTriggered: true,
        eventId: event.ids[0]
      };
    });

    console.log(`[DAILY_MARKET_DEMAND] Daily market demand analysis triggered:`, results);
    return results;
  }
);

export const dailyRedditScrape = inngest.createFunction(
  { 
    id: "daily-reddit-scrape",
    concurrency: {
      limit: 1
    }
  },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const results = await step.run("trigger-mega-batch-scraping", async () => {
      const activeSubreddits = await getActiveSubreddits();
      const subredditNames = activeSubreddits.map(sub => sub.name);
      
      console.log(`[DAILY_SCRAPE] Triggering mega-batch scraping for all ${subredditNames.length} active subreddits`);
      
      const event = await inngest.send({
        name: "reddit/scrape.all-subreddits",
        data: {
          timestamp: new Date().toISOString(),
          subreddits: subredditNames,
        }
      });
      
      return { 
        megaBatchTriggered: true,
        subredditsIncluded: subredditNames.length,
        eventId: event.ids[0]
      };
    });

    console.log(`[DAILY_SCRAPE] Mega-batch scraping triggered:`, results);
    return results;
  }
);

export const scrapeAllSubreddits = inngest.createFunction(
  { 
    id: "scrape-all-subreddits",
    retries: 3,
    rateLimit: {
      limit: 100,
      period: "1m"
    }
  },
  { event: "reddit/scrape.all-subreddits" },
  async ({ step }) => {
    const activeSubreddits = await step.run("get-active-subreddits", async () => {
      const subreddits = await getActiveSubreddits();
      return subreddits.map(sub => sub.name);
    });
    
    console.log(`[MEGA_SCRAPE] Starting mega-scrape for all ${activeSubreddits.length} active subreddits`);

    // Fetch posts from all subreddits in parallel
    const allPosts = await step.run("fetch-all-subreddit-posts", async () => {
      const client = createRedditClient();
      const allFetchedPosts = [];
      
      console.log(`[MEGA_SCRAPE] Fetching posts from ${activeSubreddits.length} subreddits in parallel`);
      
      // Fetch from all subreddits concurrently
      const fetchPromises = activeSubreddits.map(async (subreddit) => {
        try {
          console.log(`[MEGA_SCRAPE] Fetching from r/${subreddit}`);
          const posts = await client.fetchSubredditPosts(subreddit, 'hot', 25);
          console.log(`[MEGA_SCRAPE] Fetched ${posts.length} posts from r/${subreddit}`);
          return posts;
        } catch (error) {
          console.error(`[MEGA_SCRAPE] Error fetching r/${subreddit}:`, error);
          
          // Handle specific Reddit errors gracefully
          if (error instanceof Error && 'isBlocked' in error && error.isBlocked) {
            console.log(`[MEGA_SCRAPE] Skipping blocked subreddit r/${subreddit}`);
            return [];
          }
          
          throw error;
        }
      });
      
      // Wait for all subreddits to complete
      const results = await Promise.allSettled(fetchPromises);
      
      // Process results and collect all posts
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const subreddit = activeSubreddits[i];
        
        if (result.status === 'fulfilled') {
          allFetchedPosts.push(...result.value);
          console.log(`[MEGA_SCRAPE] Successfully processed r/${subreddit}: ${result.value.length} posts`);
        } else {
          console.error(`[MEGA_SCRAPE] Failed to process r/${subreddit}:`, result.reason);
        }
      }
      
      console.log(`[MEGA_SCRAPE] Total posts fetched across all subreddits: ${allFetchedPosts.length}`);
      return allFetchedPosts;
    });

    // Store all posts and filter for new ones
    const storedPosts = await step.run("store-and-filter-posts", async () => {
      console.log(`[MEGA_SCRAPE] Processing ${allPosts.length} posts for storage and deduplication`);
      
      const newPosts = [];
      const skippedPosts = [];
      
      for (const post of allPosts) {
        try {
          // Check for duplicates
          const existingPost = await checkRedditPostDuplication(post.redditId, post.subreddit, post.title, post.content, post.author);
          
          if (existingPost.isDuplicate) {
            skippedPosts.push({ post: post.title, reason: existingPost.reason });
            
            // Update existing post if it's the same but has new engagement
            if (existingPost.existingId) {
              await updateRedditPost(existingPost.existingId, {
                score: post.score,
                upvotes: post.upvotes,
                downvotes: post.downvotes,
                numComments: post.numComments
              });
            }
            continue;
          }
          
          // Store new post
          const storedPost = await prisma.redditPost.create({
            data: {
              redditId: post.redditId,
              title: post.title,
              content: post.content,
              subreddit: post.subreddit,
              author: post.author,
              score: post.score,
              upvotes: post.upvotes,
              downvotes: post.downvotes,
              numComments: post.numComments,
              url: post.url,
              permalink: post.permalink,
              createdUtc: post.createdUtc,
            }
          });
          
          newPosts.push(storedPost);
          
        } catch (error) {
          console.error(`[MEGA_SCRAPE] Error processing post ${post.title}:`, error);
          skippedPosts.push({ post: post.title, reason: 'Storage error' });
        }
      }
      
      console.log(`[MEGA_SCRAPE] Stored ${newPosts.length} new posts, skipped ${skippedPosts.length} duplicates`);
      if (skippedPosts.length > 0) {
        console.log(`[MEGA_SCRAPE] Skipped reasons:`, skippedPosts.map(p => p.reason));
      }
      
      return newPosts;
    });

    // Trigger immediate AI analysis for all posts
    if (storedPosts.length > 0) {
      await step.run("trigger-immediate-ai-analysis", async () => {
        console.log(`[MEGA_SCRAPE] Triggering immediate AI analysis for ${storedPosts.length} posts across all subreddits`);
        
        await inngest.send({
          name: "ai/batch-analyze.opportunities",
          data: {
            subreddit: "mixed",
            posts: storedPosts.map(post => ({
              postId: post.id,
              postTitle: post.title,
              postContent: post.content,
              subreddit: post.subreddit,
              author: post.author,
              score: post.score,
              numComments: post.numComments,
            })),
            triggeredBy: "immediate-mega-scrape-processing",
            batchInfo: {
              batchNumber: 1,
              totalBatches: 1,
              postsInBatch: storedPosts.length,
              totalPosts: storedPosts.length,
              isMixedSubreddits: true,
              isImmediateProcessing: true,
              timestamp: new Date().toISOString(),
            }
          }
        });
        
        console.log(`[MEGA_SCRAPE] AI analysis event sent for ${storedPosts.length} posts`);
      });
    } else {
      console.log(`[MEGA_SCRAPE] No new posts to analyze`);
    }

    // Update cursors for all subreddits
    const cursorUpdateResults = await step.run("update-all-subreddit-cursors", async () => {
      console.log(`[MEGA_SCRAPE] Updating cursors for all subreddits`);
      
      const subredditGroups = storedPosts.reduce((groups, post) => {
        if (!groups[post.subreddit]) {
          groups[post.subreddit] = [];
        }
        groups[post.subreddit].push(post);
        return groups;
      }, {} as Record<string, typeof storedPosts>);
      
      const cursorUpdates = [];
      const updateResults = [];
      
      for (const [subreddit, posts] of Object.entries(subredditGroups)) {
        if (posts.length > 0) {
          // Find the newest post for this subreddit
          const newestPost = posts.reduce((newest, post) => 
            new Date(post.createdUtc).getTime() > new Date(newest.createdUtc).getTime() ? post : newest
          , posts[0]);
          
          cursorUpdates.push(
            prisma.subredditCursor.upsert({
              where: { subreddit },
              update: {
                lastRedditId: newestPost.redditId,
                lastCreatedUtc: newestPost.createdUtc,
                postsProcessed: { increment: posts.length },
                updatedAt: new Date()
              },
              create: {
                subreddit,
                lastRedditId: newestPost.redditId,
                lastCreatedUtc: newestPost.createdUtc,
                postsProcessed: posts.length
              }
            })
          );
          
          updateResults.push({
            subreddit,
            postsProcessed: posts.length,
            newCursor: newestPost.redditId,
            newCursorDate: newestPost.createdUtc,
            oldestPostInBatch: posts[posts.length - 1]?.redditId,
            newestPostInBatch: newestPost.redditId,
          });
        }
      }
      
      await Promise.all(cursorUpdates);
      
      const finalResults = {
        subredditsUpdated: Object.keys(subredditGroups).length,
        totalPostsProcessed: storedPosts.length,
        cursorUpdates: updateResults,
        subredditBreakdown: Object.entries(subredditGroups).map(([subreddit, posts]) => ({
          subreddit,
          postCount: posts.length,
          newestPost: posts.reduce((newest, post) => 
            new Date(post.createdUtc).getTime() > new Date(newest.createdUtc).getTime() ? post : newest
          , posts[0])?.redditId
        })),
      };
      
      console.log(`[MEGA_SCRAPE] Updated cursors for ${Object.keys(subredditGroups).length} subreddits:`, finalResults);
      return finalResults;
    });

    const result = { 
      subredditsProcessed: activeSubreddits.length,
      totalPostsFetched: allPosts.length,
      newPostsStored: storedPosts.length,
      cursorUpdateResults,
      aiProcessingTriggered: storedPosts.length > 0,
    };
    
    console.log(`[MEGA_SCRAPE] Mega-scrape completed:`, result);
    return result;
  }
);

export const batchAnalyzeOpportunitiesFunction = inngest.createFunction(
  { 
    id: "batch-analyze-opportunities",
    retries: 2, // Reduced retries for batch operations
    rateLimit: {
      limit: 5,
      period: "1m"
    }
  },
  { event: "ai/batch-analyze.opportunities" },
  async ({ event, step }) => {
    // Step 1: Validate and log input data
    const inputValidation = await step.run("validate-input-data", async () => {
      const { subreddit, posts } = event.data;
      
      console.log(`[BATCH_AI] Input validation for batch analysis`);
      console.log(`[BATCH_AI] Subreddit: ${subreddit}`);
      console.log(`[BATCH_AI] Posts received: ${posts?.length || 0}`);
      
      if (!subreddit) {
        throw new NonRetriableError("Subreddit is required but not provided");
      }
      
      if (!posts || !Array.isArray(posts) || posts.length === 0) {
        throw new NonRetriableError(`Invalid posts data: ${posts ? `Array with ${posts.length} items` : 'null/undefined'}`);
      }
      
      // Validate post structure - content can be empty/null for image/link posts
      const invalidPosts = posts.filter(post => 
        !post.postId || !post.postTitle || !post.subreddit
      );
      
      if (invalidPosts.length > 0) {
        console.error(`[BATCH_AI] Found ${invalidPosts.length} invalid posts:`, invalidPosts.map(p => p.postId || 'unknown'));
        throw new NonRetriableError(`${invalidPosts.length} posts have missing required fields`);
      }
      
      const validationResult = {
        subreddit,
        totalPosts: posts.length,
        samplePost: {
          postId: posts[0].postId,
          postTitle: posts[0].postTitle?.substring(0, 50) + '...',
          hasContent: !!posts[0].postContent,
          contentLength: posts[0].postContent?.length || 0,
          subreddit: posts[0].subreddit,
          author: posts[0].author,
          score: posts[0].score,
          numComments: posts[0].numComments,
        },
        allPostIds: posts.map(p => p.postId),
      };
      
      console.log(`[BATCH_AI] Validation successful:`, validationResult);
      return validationResult;
    });

    // Step 2: Prepare batch requests
    const batchRequests = await step.run("prepare-batch-requests", async () => {
      const { subreddit, posts } = event.data;
      
      console.log(`[BATCH_AI] Preparing batch requests for ${posts.length} posts`);
      
      const requests: BatchAnalysisRequest[] = posts.map((post: {
        postId: string;
        postTitle: string;
        postContent: string;
        subreddit: string;
        author: string;
        score: number;
        numComments: number;
      }, index: number) => ({
        id: `${subreddit}_${index}`,
        postId: post.postId,
        postTitle: post.postTitle,
        postContent: post.postContent,
        subreddit: post.subreddit,
        author: post.author,
        score: post.score,
        numComments: post.numComments,
      }));
      
      console.log(`[BATCH_AI] Prepared ${requests.length} batch requests`);
      console.log(`[BATCH_AI] Request IDs: ${requests.map(r => r.id).join(', ')}`);
      
      return requests;
    });

    // Step 3: Execute batch AI analysis
    const aiAnalysisResults = await step.run("execute-batch-ai-analysis", async () => {
      console.log(`[BATCH_AI] Starting AI analysis for ${batchRequests.length} posts`);
      
      try {
        const batchResponse = await batchAnalyzeOpportunities(batchRequests, 8); // Process 8 posts per batch
        
        console.log(`[BATCH_AI] AI analysis completed with ${batchResponse.results.length} results`);
        console.log(`[BATCH_AI] Results summary: ${batchResponse.results.map(r => `${r.id}: ${r.success ? 'success' : 'failed'}`).join(', ')}`);
        
        return batchResponse;
      } catch (analysisError) {
        console.error(`[BATCH_AI] Batch analysis failed:`, analysisError);
        
        // Check if it's a non-retriable AI error
        if (analysisError instanceof Error) {
          const message = analysisError.message.toLowerCase();
          if (
            message.includes('api key') ||
            message.includes('unauthorized') ||
            message.includes('forbidden') ||
            message.includes('bad request') ||
            message.includes('invalid model') ||
            message.includes('malformed')
          ) {
            throw new NonRetriableError(`AI configuration error: ${analysisError.message}`);
          }
          
          // Rate limit or quota errors are retriable
          if (
            message.includes('rate limit') ||
            message.includes('quota') ||
            message.includes('too many requests') ||
            message.includes('service unavailable') ||
            message.includes('timeout')
          ) {
            console.log(`[BATCH_AI] Retriable AI error, will retry: ${analysisError.message}`);
            throw analysisError; // Let Inngest retry
          }
        }
        
        // Default to retriable for unknown errors
        throw new Error(`Batch AI analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
      }
    });

    // Step 4: Process and store results
    const processedResults = await step.run("process-and-store-results", async () => {
      console.log(`[BATCH_AI] Processing ${aiAnalysisResults.results.length} batch results`);
      
      const processed = processBatchResults(aiAnalysisResults.results);
      
      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;
      let notFoundCount = 0;
      const storedOpportunities = [];
      const errors = [];
      
      for (const result of processed) {
        try {
          if (result.success && result.analysis && result.analysis.isOpportunity && result.analysis.opportunity) {
            // Find the post in database
            const post = await prisma.redditPost.findUnique({
              where: { id: result.postId }
            });
            
            if (!post) {
              console.error(`[BATCH_AI] Post ${result.postId} not found in database`);
              notFoundCount++;
              continue;
            }

            // Check for duplicate opportunity
            const existingOpp = await checkOpportunityDuplication(
              result.analysis.opportunity.title, 
              result.analysis.opportunity.description, 
              result.analysis.opportunity.proposedSolution,
              result.analysis.opportunity.categories.niche
            );
            
            if (existingOpp.isDuplicate) {
              console.log(`[BATCH_AI] Duplicate opportunity detected: ${result.analysis.opportunity.title}`);
              duplicateCount++;
              continue;
            }

            // Store the opportunity
            const opportunity = await prisma.opportunity.create({
              data: {
                title: result.analysis.opportunity.title,
                description: result.analysis.opportunity.description,
                proposedSolution: result.analysis.opportunity.proposedSolution,
                marketContext: result.analysis.opportunity.marketContext,
                implementationNotes: result.analysis.opportunity.implementationNotes,
                marketSize: result.analysis.opportunity.marketSize,
                complexity: result.analysis.opportunity.complexity,
                successProbability: result.analysis.opportunity.successProbability,
                subreddit: post.subreddit,
                
                // Delta 4 scores
                speedScore: result.analysis.opportunity.delta4Scores.speed,
                convenienceScore: result.analysis.opportunity.delta4Scores.convenience,
                trustScore: result.analysis.opportunity.delta4Scores.trust,
                priceScore: result.analysis.opportunity.delta4Scores.price,
                statusScore: result.analysis.opportunity.delta4Scores.status,
                predictabilityScore: result.analysis.opportunity.delta4Scores.predictability,
                uiUxScore: result.analysis.opportunity.delta4Scores.uiUx,
                easeOfUseScore: result.analysis.opportunity.delta4Scores.easeOfUse,
                legalFrictionScore: result.analysis.opportunity.delta4Scores.legalFriction,
                emotionalComfortScore: result.analysis.opportunity.delta4Scores.emotionalComfort,
                
                // Calculated values
                overallScore: result.analysis.opportunity.overallScore,
                viabilityThreshold: result.analysis.opportunity.viabilityThreshold,
                
                // Categories
                businessType: result.analysis.opportunity.categories.businessType,
                businessModel: result.analysis.opportunity.categories.businessModel,
                revenueModel: result.analysis.opportunity.categories.revenueModel,
                pricingModel: result.analysis.opportunity.categories.pricingModel,
                platform: result.analysis.opportunity.categories.platform,
                mobileSupport: result.analysis.opportunity.categories.mobileSupport,
                deploymentType: result.analysis.opportunity.categories.deploymentType,
                developmentType: result.analysis.opportunity.categories.developmentType,
                targetAudience: result.analysis.opportunity.categories.targetAudience,
                userType: result.analysis.opportunity.categories.userType,
                technicalLevel: result.analysis.opportunity.categories.technicalLevel,
                ageGroup: result.analysis.opportunity.categories.ageGroup,
                geography: result.analysis.opportunity.categories.geography,
                marketType: result.analysis.opportunity.categories.marketType,
                economicLevel: result.analysis.opportunity.categories.economicLevel,
                industryVertical: result.analysis.opportunity.categories.industryVertical,
                niche: result.analysis.opportunity.categories.niche,
                developmentComplexity: result.analysis.opportunity.categories.developmentComplexity,
                teamSize: result.analysis.opportunity.categories.teamSize,
                capitalRequirement: result.analysis.opportunity.categories.capitalRequirement,
                developmentTime: result.analysis.opportunity.categories.developmentTime,
                marketSizeCategory: result.analysis.opportunity.categories.marketSizeCategory,
                competitionLevel: result.analysis.opportunity.categories.competitionLevel,
                marketTrend: result.analysis.opportunity.categories.marketTrend,
                growthPotential: result.analysis.opportunity.categories.growthPotential,
                acquisitionStrategy: result.analysis.opportunity.categories.acquisitionStrategy,
                scalabilityType: result.analysis.opportunity.categories.scalabilityType,
                
                // Market Validation Fields
                marketValidationScore: result.analysis.opportunity.marketValidation.marketValidationScore,
                engagementLevel: result.analysis.opportunity.marketValidation.engagementLevel,
                problemFrequency: result.analysis.opportunity.marketValidation.problemFrequency,
                customerType: result.analysis.opportunity.marketValidation.customerType,
                paymentWillingness: result.analysis.opportunity.marketValidation.paymentWillingness,
                competitiveAnalysis: result.analysis.opportunity.marketValidation.competitiveAnalysis,
                validationTier: result.analysis.opportunity.marketValidation.validationTier,
              }
            });

            // Create the opportunity source relationship
            await prisma.opportunitySource.create({
              data: {
                opportunityId: opportunity.id,
                redditPostId: post.id,
                sourceType: "post",
                confidence: result.analysis.confidence || 0.9,
              }
            });

            // Mark post as processed and as opportunity
            await prisma.redditPost.update({
              where: { id: result.postId },
              data: { 
                processedAt: new Date(),
                isOpportunity: true,
                aiConfidence: result.analysis.confidence || 0.9,
                aiAnalysisDate: new Date()
              }
            });

            successCount++;
            storedOpportunities.push({
              id: opportunity.id,
              title: opportunity.title,
              overallScore: opportunity.overallScore,
              viable: opportunity.viabilityThreshold,
              postId: result.postId,
            });
            
            console.log(`[BATCH_AI] Successfully stored opportunity: ${result.analysis.opportunity.title} (Score: ${result.analysis.opportunity.overallScore})`);
          } else {
            // Post was analyzed but is not an opportunity
            if (result.success && result.analysis && !result.analysis.isOpportunity) {
              // Mark post as rejected
              await prisma.redditPost.update({
                where: { id: result.postId },
                data: { 
                  processedAt: new Date(),
                  isOpportunity: false,
                  rejectionReasons: result.analysis.reasons || ["No opportunity identified"],
                  aiConfidence: result.analysis.confidence || 0.0,
                  aiAnalysisDate: new Date()
                }
              });
              console.log(`[BATCH_AI] Post ${result.postId} marked as non-opportunity: ${result.analysis.reasons?.[0] || "No specific reason"}`);
            } else {
              // Analysis error
              errorCount++;
              const errorMsg = result.error || (result.analysis?.reasons?.[0] || "Unknown analysis error");
              errors.push({ postId: result.postId, error: errorMsg });
              console.error(`[BATCH_AI] Analysis failed for post ${result.postId}: ${errorMsg}`);
            }
          }
        } catch (storeError) {
          console.error(`[BATCH_AI] Failed to store opportunity for post ${result.postId}:`, storeError);
          errorCount++;
          errors.push({ postId: result.postId, error: storeError instanceof Error ? storeError.message : 'Unknown error' });
        }
      }
      
      const processingResults = {
        successCount,
        errorCount,
        duplicateCount,
        notFoundCount,
        storedOpportunities,
        errors: errors.slice(0, 10), // Limit errors to first 10 to avoid huge payloads
      };
      
      console.log(`[BATCH_AI] Processing completed:`, processingResults);
      return processingResults;
    });

    // Step 5: Compile final results
    const finalResults = await step.run("compile-final-results", async () => {
      const results = {
        subreddit: inputValidation.subreddit,
        postsAnalyzed: inputValidation.totalPosts,
        batchRequestsPrepared: batchRequests.length,
        aiAnalysisResults: aiAnalysisResults.results.length,
        successCount: processedResults.successCount,
        errorCount: processedResults.errorCount,
        duplicateCount: processedResults.duplicateCount,
        notFoundCount: processedResults.notFoundCount,
        storedOpportunities: processedResults.storedOpportunities,
        errors: processedResults.errors,
        executionSummary: {
          totalInputPosts: inputValidation.totalPosts,
          validOpportunities: processedResults.successCount,
          duplicatesSkipped: processedResults.duplicateCount,
          postsNotFound: processedResults.notFoundCount,
          analysisFailures: processedResults.errorCount,
          successRate: ((processedResults.successCount / inputValidation.totalPosts) * 100).toFixed(1) + '%',
        },
      };
      
      console.log(`[BATCH_AI] Final results compiled:`, results);
      return results;
    });
    
    console.log(`[BATCH_AI] Batch analysis completed successfully for r/${inputValidation.subreddit}`);
    console.log(`[BATCH_AI] Summary: ${finalResults.successCount}/${finalResults.postsAnalyzed} opportunities created (${(finalResults.executionSummary as { successRate?: string }).successRate} success rate)`);
    
    return finalResults;
  }
);

export const analyzeMarketDemands = inngest.createFunction(
  { 
    id: "analyze-market-demands",
    retries: 2,
  },
  { event: "market/analyze.demands" },
  async ({ step }) => {
    console.log(`[MARKET_DEMAND] Starting market demand analysis`);

    // Step 1: Aggregate similar niches
    const nicheAnalysis = await step.run("aggregate-similar-niches", async () => {
      // Get all opportunities with their niches
      const opportunities = await prisma.opportunity.findMany({
        select: {
          id: true,
          niche: true,
          title: true,
          description: true,
          proposedSolution: true,
          overallScore: true,
          viabilityThreshold: true,
          subreddit: true,
          createdAt: true,
        },
        where: {
          AND: [
            { niche: { not: null } },
            { niche: { not: "Unknown" } },
          ],
        },
      });

      console.log(`[MARKET_DEMAND] Found ${opportunities.length} opportunities with niches`);

      // Group opportunities by similar niches
      const nicheGroups: Record<string, typeof opportunities> = {};
      
      opportunities.forEach(opp => {
        const niche = opp.niche || 'Unknown';
        if (!nicheGroups[niche]) {
          nicheGroups[niche] = [];
        }
        nicheGroups[niche].push(opp);
      });

      // Convert to array and sort by count
      const sortedNiches = Object.entries(nicheGroups)
        .map(([niche, opps]) => ({
          niche,
          opportunities: opps,
          count: opps.length,
          avgScore: opps.reduce((sum, o) => sum + o.overallScore, 0) / opps.length,
          viableCount: opps.filter(o => o.viabilityThreshold).length,
        }))
        .sort((a, b) => b.count - a.count);

      console.log(`[MARKET_DEMAND] Found ${sortedNiches.length} unique niches`);
      console.log(`[MARKET_DEMAND] Top 5 niches:`, sortedNiches.slice(0, 5).map(n => `${n.niche} (${n.count})`));

      return sortedNiches;
    });

    // Step 2: Extract common demand patterns
    const demandPatterns = await step.run("extract-demand-patterns", async () => {
      const patterns: Array<{
        pattern: string;
        niche: string;
        occurrences: Array<{
          opportunityId: string;
          title: string;
          subreddit: string;
        }>;
      }> = [];

      // For each niche group, analyze common patterns
      for (const nicheGroup of nicheAnalysis.slice(0, 20)) { // Process top 20 niches
        // Extract common keywords from titles and descriptions
        const commonPhrases = extractCommonPhrases(
          nicheGroup.opportunities.map(o => `${o.title} ${o.description}`)
        );

        for (const phrase of commonPhrases.slice(0, 3)) { // Top 3 phrases per niche
          patterns.push({
            pattern: phrase,
            niche: nicheGroup.niche,
            occurrences: nicheGroup.opportunities
              .filter(o => 
                o.title.toLowerCase().includes(phrase.toLowerCase()) || 
                o.description.toLowerCase().includes(phrase.toLowerCase())
              )
              .map(o => ({
                opportunityId: o.id,
                title: o.title,
                subreddit: o.subreddit,
              })),
          });
        }
      }

      console.log(`[MARKET_DEMAND] Extracted ${patterns.length} demand patterns`);
      return patterns;
    });

    // Step 3: Update market demand clusters
    const clusterResults = await step.run("update-market-clusters", async () => {
      let updatedClusters = 0;
      let newClusters = 0;

      for (const pattern of demandPatterns) {
        if (pattern.occurrences.length < 2) continue; // Skip patterns with only 1 occurrence

        // Check if cluster already exists
        const existingCluster = await prisma.marketDemandCluster.findFirst({
          where: {
            niche: pattern.niche,
            demandSignal: pattern.pattern,
          },
        });

        if (existingCluster) {
          // Update existing cluster
          await prisma.marketDemandCluster.update({
            where: { id: existingCluster.id },
            data: {
              occurrenceCount: pattern.occurrences.length,
              lastSeen: new Date(),
              subreddits: Array.from(new Set(pattern.occurrences.map(o => o.subreddit))),
            },
          });
          updatedClusters++;

          // Update opportunity associations
          // First, remove old associations
          await prisma.marketDemandOpportunity.deleteMany({
            where: { clusterId: existingCluster.id },
          });

          // Then create new ones
          for (const occ of pattern.occurrences) {
            await prisma.marketDemandOpportunity.create({
              data: {
                clusterId: existingCluster.id,
                opportunityId: occ.opportunityId,
              },
            });
          }
        } else {
          // Create new cluster
          const newCluster = await prisma.marketDemandCluster.create({
            data: {
              niche: pattern.niche,
              demandSignal: pattern.pattern,
              occurrenceCount: pattern.occurrences.length,
              subreddits: Array.from(new Set(pattern.occurrences.map(o => o.subreddit))),
              embedding: [], // Would need to generate embeddings in a real implementation
            },
          });
          newClusters++;

          // Create opportunity associations
          for (const occ of pattern.occurrences) {
            await prisma.marketDemandOpportunity.create({
              data: {
                clusterId: newCluster.id,
                opportunityId: occ.opportunityId,
              },
            });
          }
        }
      }

      console.log(`[MARKET_DEMAND] Updated ${updatedClusters} clusters, created ${newClusters} new clusters`);
      return { updatedClusters, newClusters };
    });

    // Step 4: Clean up old clusters
    const cleanupResults = await step.run("cleanup-old-clusters", async () => {
      // Remove clusters that haven't been seen in 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const deletedClusters = await prisma.marketDemandCluster.deleteMany({
        where: {
          lastSeen: { lt: sixtyDaysAgo },
          occurrenceCount: { lt: 3 }, // Only delete if low occurrence
        },
      });

      console.log(`[MARKET_DEMAND] Cleaned up ${deletedClusters.count} old clusters`);
      return { deletedCount: deletedClusters.count };
    });

    const finalResults = {
      nichesAnalyzed: nicheAnalysis.length,
      patternsExtracted: demandPatterns.length,
      clustersUpdated: clusterResults.updatedClusters,
      clustersCreated: clusterResults.newClusters,
      clustersDeleted: cleanupResults.deletedCount,
      topNiches: nicheAnalysis.slice(0, 5).map(n => ({
        niche: n.niche,
        count: n.count,
        avgScore: n.avgScore.toFixed(1),
        viablePercentage: ((n.viableCount / n.count) * 100).toFixed(0) + '%',
      })),
    };

    console.log(`[MARKET_DEMAND] Market demand analysis completed:`, finalResults);
    return finalResults;
  }
);

// Helper function to extract common phrases
function extractCommonPhrases(texts: string[]): string[] {
  const phraseCount: Record<string, number> = {};
  
  // Extract 2-3 word phrases
  texts.forEach(text => {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2); // Filter short words
    
    // Extract 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
    }
    
    // Extract 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
    }
  });
  
  // Sort by count and return top phrases
  return Object.entries(phraseCount)
    .filter(([, count]) => count >= 2) // At least 2 occurrences
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase)
    .slice(0, 10); // Top 10 phrases
}

export const analyzeRedditComments = inngest.createFunction(
  { 
    id: "analyze-reddit-comments",
    retries: 2,
  },
  { event: "reddit/analyze.comments" },
  async ({ event, step }) => {
    const { postId, permalink } = event.data;
    console.log(`[ANALYZE_COMMENTS] Starting comment analysis for post ${postId}`);

    // Step 0: Mark job as started
    await step.run("mark-job-started", async () => {
      await prisma.redditPost.update({
        where: { id: postId },
        data: {
          commentAnalysisStatus: 'processing',
          commentAnalysisStarted: new Date(),
        },
      });
    });

    try {
      // Step 1: Fetch Reddit comments
      const comments = await step.run("fetch-reddit-comments", async () => {
        const client = createRedditClient();
        
        try {
          console.log(`[ANALYZE_COMMENTS] Fetching comments from ${permalink}`);
          const commentsData = await client.fetchPostComments(permalink);
          console.log(`[ANALYZE_COMMENTS] Found ${commentsData.length} comments`);
          return commentsData;
        } catch (error) {
          console.error(`[ANALYZE_COMMENTS] Error fetching comments:`, error);
          throw error;
        }
      });

    // Step 2: Filter and process comments
    const processedComments = await step.run("process-comments", async () => {
      // Filter out low-quality comments
      const filteredComments = comments.filter(comment => {
        const c = comment as unknown as { body: string; score: number };
        return c.body && 
          c.body.length > 20 && 
          c.body !== '[deleted]' && 
          c.body !== '[removed]' &&
          c.score > 0; // Only comments with positive score
      });

      console.log(`[ANALYZE_COMMENTS] Filtered to ${filteredComments.length} quality comments`);
      
      // Sort by score and take top 20
      const topComments = filteredComments
        .sort((a, b) => (b as unknown as { score: number }).score - (a as unknown as { score: number }).score)
        .slice(0, 20);

      console.log(`[ANALYZE_COMMENTS] Processing top ${topComments.length} comments`);
      return topComments;
    });

    // Step 3: Analyze comments for additional opportunities
    const analysisResults = await step.run("analyze-comments-for-opportunities", async () => {
      if (processedComments.length === 0) {
        console.log(`[ANALYZE_COMMENTS] No comments to analyze`);
        return { opportunities: [], totalAnalyzed: 0 };
      }

      // const analyzer = new Delta4Analyzer(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
      const opportunities: unknown[] = [];

      // Skip AI analysis for now - just log comments for debugging
      console.log(`[ANALYZE_COMMENTS] Skipping AI analysis to prevent timeout. Comments found:`, processedComments.length);
      
      // TODO: Implement faster batch analysis
      processedComments.forEach((comment, index) => {
        const c = comment as unknown as { id: string; body: string; author: string; score: number };
        console.log(`[ANALYZE_COMMENTS] Comment ${index + 1}:`, {
          id: c.id,
          author: c.author,
          score: c.score,
          bodyPreview: String(c.body).substring(0, 100) + '...'
        });
      });

      console.log(`[ANALYZE_COMMENTS] Found ${opportunities.length} opportunities from comments`);
      return { opportunities, totalAnalyzed: processedComments.length };
    });

    // Define the type for comment analysis results
    interface CommentAnalysisResult {
      opportunity: {
        title: string;
        description: string;
        currentSolution?: string;
        proposedSolution: string;
        marketContext?: string;
        implementationNotes?: string;
        delta4Scores: {
          speed: number;
          convenience: number;
          trust: number;
          price: number;
          status: number;
          predictability: number;
          uiUx: number;
          easeOfUse: number;
          legalFriction: number;
          emotionalComfort: number;
        };
        overallScore: number;
        viabilityThreshold: boolean;
        marketSize?: string;
        complexity?: string;
        successProbability?: string;
        categories?: Record<string, string>;
        marketValidation?: Record<string, string | number>;
      };
      confidence: number;
    }

    // Step 4: Store results in database
    const storageResults = await step.run("store-comment-analysis-results", async () => {
      // Get the original post
      const post = await prisma.redditPost.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Store each comment-derived opportunity
      let stored = 0;
      
      // Since we're temporarily returning empty opportunities array, skip storage
      // TODO: Re-enable when comment analysis is implemented
      if (analysisResults.opportunities.length === 0) {
        return { stored: 0 };
      }
      
      // This code won't run until comment analysis is re-enabled
      type OpportunityCreateInput = Prisma.OpportunityCreateInput;
      
      for (const result of analysisResults.opportunities) {
        try {
          const typedResult = result as CommentAnalysisResult;
          
          // Check for duplicate opportunity
          const existingOpp = await checkOpportunityDuplication(
            typedResult.opportunity.title,
            typedResult.opportunity.description,
            typedResult.opportunity.proposedSolution,
            typedResult.opportunity.categories?.niche || 'general'
          );
          
          if (existingOpp.isDuplicate) {
            console.log(`[ANALYZE_COMMENTS] Duplicate opportunity from comment: ${typedResult.opportunity.title}`);
            continue;
          }

          // Create opportunity data
          const opportunityData: OpportunityCreateInput = {
            title: typedResult.opportunity.title,
            description: typedResult.opportunity.description,
            proposedSolution: typedResult.opportunity.proposedSolution,
            marketContext: typedResult.opportunity.marketContext || '',
            implementationNotes: typedResult.opportunity.implementationNotes || '',
            marketSize: typedResult.opportunity.marketSize || 'unknown',
            complexity: typedResult.opportunity.complexity || 'unknown',
            successProbability: typedResult.opportunity.successProbability || 'unknown',
            subreddit: post.subreddit,
            
            // Delta 4 scores
            speedScore: typedResult.opportunity.delta4Scores.speed,
            convenienceScore: typedResult.opportunity.delta4Scores.convenience,
            trustScore: typedResult.opportunity.delta4Scores.trust,
            priceScore: typedResult.opportunity.delta4Scores.price,
            statusScore: typedResult.opportunity.delta4Scores.status,
            predictabilityScore: typedResult.opportunity.delta4Scores.predictability,
            uiUxScore: typedResult.opportunity.delta4Scores.uiUx,
            easeOfUseScore: typedResult.opportunity.delta4Scores.easeOfUse,
            legalFrictionScore: typedResult.opportunity.delta4Scores.legalFriction,
            emotionalComfortScore: typedResult.opportunity.delta4Scores.emotionalComfort,
            
            // Calculated values
            overallScore: typedResult.opportunity.overallScore,
            viabilityThreshold: typedResult.opportunity.viabilityThreshold,
            
            // Optional categories with defaults
            businessType: typedResult.opportunity.categories?.businessType || 'unknown',
            industryVertical: typedResult.opportunity.categories?.industryVertical || 'unknown',
            niche: typedResult.opportunity.categories?.niche || 'general'
          };

          // Store the opportunity
          const opportunity = await prisma.opportunity.create({
            data: opportunityData
          });

          // Create the opportunity source relationship
          await prisma.opportunitySource.create({
            data: {
              opportunityId: opportunity.id,
              redditPostId: post.id,
              sourceType: "comment",
              confidence: typedResult.confidence || 0.8,
            }
          });

          stored++;
          console.log(`[ANALYZE_COMMENTS] Stored comment-derived opportunity: ${opportunity.title}`);
        } catch (error) {
          console.error(`[ANALYZE_COMMENTS] Error storing comment opportunity:`, error);
        }
      }

      return { stored };
    });

      // Step 5: Mark job as completed
      await step.run("mark-job-completed", async () => {
        await prisma.redditPost.update({
          where: { id: postId },
          data: {
            commentAnalysisStatus: 'completed',
            commentAnalysisCompleted: new Date(),
            commentOpportunitiesFound: storageResults.stored,
            commentAnalysisError: null,
          },
        });
      });

      const finalResults = {
        postId,
        permalink,
        commentsFound: comments.length,
        commentsAnalyzed: analysisResults.totalAnalyzed,
        opportunitiesFound: analysisResults.opportunities.length,
        opportunitiesStored: storageResults.stored,
        summary: analysisResults.opportunities.map((o: unknown) => {
          const oppData = o as CommentAnalysisResult;
          return {
            title: oppData.opportunity?.title || 'Unknown',
            score: oppData.opportunity?.overallScore || 0,
            viable: oppData.opportunity?.viabilityThreshold || false,
            commentScore: 0, // Not available in the current structure
          };
        }),
      };

      console.log(`[ANALYZE_COMMENTS] Comment analysis completed:`, finalResults);
      return finalResults;
    } catch (error) {
      // Step 6: Mark job as failed
      await step.run("mark-job-failed", async () => {
        await prisma.redditPost.update({
          where: { id: postId },
          data: {
            commentAnalysisStatus: 'failed',
            commentAnalysisCompleted: new Date(),
            commentAnalysisError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      });

      console.error(`[ANALYZE_COMMENTS] Comment analysis failed for post ${postId}:`, error);
      throw error;
    }
  }
);

export const processUnprocessedPosts = inngest.createFunction(
  { 
    id: "process-unprocessed-posts",
    retries: 2, // Reduced retries for batch operations
    rateLimit: {
      limit: 2,
      period: "1m"
    }
  },
  { event: "ai/process-unprocessed-posts" },
  async ({ event, step }) => {
    // Step 1: Find all unprocessed Reddit posts
    const unprocessedPosts = await step.run("find-unprocessed-posts", async () => {
      console.log(`[PROCESS_UNPROCESSED] Finding unprocessed Reddit posts`);
      
      const posts = await prisma.redditPost.findMany({
        where: {
          processedAt: null,
          processingError: null,
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: event.data?.limit || 500, // Default to 500 posts max
      });
      
      const postsBySubreddit = posts.reduce((groups, post) => {
        if (!groups[post.subreddit]) {
          groups[post.subreddit] = [];
        }
        groups[post.subreddit].push(post);
        return groups;
      }, {} as Record<string, typeof posts>);
      
      const result = {
        totalUnprocessed: posts.length,
        subredditsWithUnprocessed: Object.keys(postsBySubreddit).length,
        breakdown: Object.entries(postsBySubreddit).map(([subreddit, posts]) => ({
          subreddit,
          count: posts.length,
          oldestPost: posts[posts.length - 1]?.createdAt,
          newestPost: posts[0]?.createdAt,
        })),
        allPosts: posts,
      };
      
      console.log(`[PROCESS_UNPROCESSED] Found ${posts.length} unprocessed posts across ${Object.keys(postsBySubreddit).length} subreddits`);
      return result;
    });
    
    if (unprocessedPosts.totalUnprocessed === 0) {
      console.log(`[PROCESS_UNPROCESSED] No unprocessed posts found`);
      return {
        success: true,
        message: "No unprocessed posts found",
        totalProcessed: 0,
        subredditsProcessed: 0,
      };
    }
    
    // Step 2: Process posts in batches by subreddit
    const batchResults = await step.run("process-posts-in-batches", async () => {
      console.log(`[PROCESS_UNPROCESSED] Processing ${unprocessedPosts.totalUnprocessed} posts in batches`);
      
      const allResults = [];
      const batchSize = 50; // Process 50 posts at a time
      
      // Group posts by subreddit and process each subreddit's posts
      const postsBySubreddit = unprocessedPosts.allPosts.reduce((groups, post) => {
        if (!groups[post.subreddit]) {
          groups[post.subreddit] = [];
        }
        groups[post.subreddit].push(post);
        return groups;
      }, {} as Record<string, typeof unprocessedPosts.allPosts>);
      
      for (const [subreddit, posts] of Object.entries(postsBySubreddit)) {
        console.log(`[PROCESS_UNPROCESSED] Processing ${posts.length} posts from r/${subreddit}`);
        
        // Process posts in smaller batches
        for (let i = 0; i < posts.length; i += batchSize) {
          const batch = posts.slice(i, i + batchSize);
          
          // Convert posts to the format expected by batch analysis
          const batchPosts = batch.map(post => ({
            postId: post.id,
            postTitle: post.title,
            postContent: post.content || '',
            subreddit: post.subreddit,
            author: post.author,
            score: post.score,
            numComments: post.numComments,
          }));
          
          try {
            // Trigger batch analysis for this batch
            const batchEvent = await inngest.send({
              name: "ai/batch-analyze.opportunities",
              data: {
                subreddit,
                posts: batchPosts,
                triggeredBy: "manual-unprocessed-processing",
                batchInfo: {
                  batchNumber: Math.floor(i / batchSize) + 1,
                  totalBatches: Math.ceil(posts.length / batchSize),
                  postsInBatch: batch.length,
                }
              }
            });
            
            allResults.push({
              subreddit,
              batchNumber: Math.floor(i / batchSize) + 1,
              postsInBatch: batch.length,
              eventId: batchEvent.ids[0],
              success: true,
            });
            
            console.log(`[PROCESS_UNPROCESSED] Triggered batch analysis for ${batch.length} posts from r/${subreddit} (batch ${Math.floor(i / batchSize) + 1})`);
          } catch (error) {
            console.error(`[PROCESS_UNPROCESSED] Failed to trigger batch analysis for r/${subreddit}:`, error);
            allResults.push({
              subreddit,
              batchNumber: Math.floor(i / batchSize) + 1,
              postsInBatch: batch.length,
              error: error instanceof Error ? error.message : 'Unknown error',
              success: false,
            });
          }
        }
      }
      
      return allResults;
    });
    
    // Step 3: Update processing status for attempted posts
    const statusUpdateResults = await step.run("update-processing-status", async () => {
      console.log(`[PROCESS_UNPROCESSED] Updating processing status for attempted posts`);
      
      const successfulBatches = batchResults.filter(result => result.success);
      const failedBatches = batchResults.filter(result => !result.success);
      
      // For failed batches, mark posts with processing error
      const failedPostIds = [];
      for (const failedBatch of failedBatches) {
        const subredditPosts = unprocessedPosts.allPosts.filter(post => post.subreddit === failedBatch.subreddit);
        const batchStart = (failedBatch.batchNumber - 1) * 50;
        const batchEnd = batchStart + failedBatch.postsInBatch;
        const batchPosts = subredditPosts.slice(batchStart, batchEnd);
        
        for (const post of batchPosts) {
          failedPostIds.push(post.id);
        }
      }
      
      if (failedPostIds.length > 0) {
        await prisma.redditPost.updateMany({
          where: {
            id: { in: failedPostIds }
          },
          data: {
            processingError: "Failed to trigger batch analysis",
            updatedAt: new Date()
          }
        });
      }
      
      return {
        successfulBatches: successfulBatches.length,
        failedBatches: failedBatches.length,
        failedPostIds: failedPostIds.length,
        totalBatchesTriggered: batchResults.length,
      };
    });
    
    // Step 4: Compile final results
    const finalResults = await step.run("compile-final-results", async () => {
      const results = {
        success: true,
        totalUnprocessedFound: unprocessedPosts.totalUnprocessed,
        subredditsProcessed: unprocessedPosts.subredditsWithUnprocessed,
        batchesTriggered: batchResults.length,
        successfulBatches: statusUpdateResults.successfulBatches,
        failedBatches: statusUpdateResults.failedBatches,
        subredditBreakdown: unprocessedPosts.breakdown,
        batchResults: batchResults,
        processingStats: {
          postsQueued: unprocessedPosts.totalUnprocessed - statusUpdateResults.failedPostIds,
          postsErrored: statusUpdateResults.failedPostIds,
          batchSuccessRate: ((statusUpdateResults.successfulBatches / batchResults.length) * 100).toFixed(1) + '%',
        },
        timestamp: new Date().toISOString(),
      };
      
      console.log(`[PROCESS_UNPROCESSED] Final results:`, results);
      return results;
    });
    
    console.log(`[PROCESS_UNPROCESSED] Processing completed: ${finalResults.batchesTriggered} batches triggered for ${finalResults.totalUnprocessedFound} unprocessed posts`);
    
    return finalResults;
  }
);

// User Activity Scraping Functions

export const scrapeUserActivity = inngest.createFunction(
  {
    id: "scrape-user-activity",
    retries: 2,
    rateLimit: {
      limit: 10,
      period: "1m"
    }
  },
  { event: "reddit/scrape.user-activity" },
  async ({ event, step }) => {
    const { username, scrapeType = 'full', limit, timeframe = 'all' } = event.data;
    console.log(`[USER_SCRAPE] Starting user activity scraping for u/${username}`);

    // Step 1: Get or create user record
    const user = await step.run("get-or-create-user", async () => {
      let existingUser = await prisma.redditUser.findUnique({
        where: { username },
      });

      if (!existingUser) {
        // Fetch user profile first
        try {
          const profile = await redditUserScraper.fetchUserProfile(username);
          existingUser = await prisma.redditUser.create({
            data: {
              username,
              profileData: profile as unknown as Prisma.InputJsonValue,
              accountCreated: new Date(profile.created * 1000),
              linkKarma: profile.link_karma,
              commentKarma: profile.comment_karma,
              totalKarma: profile.total_karma,
              scrapingStatus: 'in_progress',
              scrapingStarted: new Date(),
            },
          });
        } catch (error) {
          console.error(`[USER_SCRAPE] Error fetching profile for u/${username}:`, error);
          throw new NonRetriableError(`User u/${username} not found or inaccessible`);
        }
      }

      // Update scraping job with user ID
      await prisma.userScrapingJob.updateMany({
        where: { username, status: 'in_progress' },
        data: { userId: existingUser.id },
      });

      return existingUser;
    });

    try {
      // Step 2: Scrape posts
      const postsResult = await step.run("scrape-posts", async () => {
        if (scrapeType === 'comments_only') {
          return { newPosts: 0, duplicatesSkipped: 0 };
        }

        console.log(`[USER_SCRAPE] Scraping posts for u/${username}`);
        
        let totalNewPosts = 0;
        let totalDuplicatesSkipped = 0;

        const posts = await redditUserScraper.fetchAllUserPosts(username, {
          maxPosts: limit || 1000,
          sort: 'new',
          t: timeframe as 'all' | 'year' | 'month' | 'week' | 'day',
          onProgress: (progress) => {
            console.log(`[USER_SCRAPE] Posts progress: ${progress.fetched}/${progress.total || 'unknown'}`);
          }
        });

        console.log(`[USER_SCRAPE] Found ${posts.length} posts to process`);

        // Process posts in batches
        const batchSize = 50;
        for (let i = 0; i < posts.length; i += batchSize) {
          const batch = posts.slice(i, i + batchSize);
          
          for (const post of batch) {
            try {
              // Check if post already exists
              const existing = await prisma.redditUserPost.findUnique({
                where: { redditId: post.id },
              });

              if (existing) {
                totalDuplicatesSkipped++;
                continue;
              }

              // Create new post
              await prisma.redditUserPost.create({
                data: {
                  userId: user.id,
                  redditId: post.id,
                  title: post.title,
                  content: post.selftext || null,
                  url: post.url,
                  permalink: post.permalink,
                  subreddit: post.subreddit,
                  author: post.author,
                  score: post.score,
                  upvotes: post.ups,
                  downvotes: post.downs,
                  numComments: post.num_comments,
                  createdUtc: new Date(post.created_utc * 1000),
                  isVideo: post.is_video,
                  isImage: !!post.post_hint?.includes('image'),
                  isLink: !post.is_self,
                  isSelf: post.is_self,
                  over18: post.over_18,
                  spoiler: post.spoiler,
                  locked: post.locked,
                  stickied: post.stickied,
                  rawData: post as unknown as Prisma.InputJsonValue,
                },
              });

              totalNewPosts++;
            } catch (error) {
              console.error(`[USER_SCRAPE] Error processing post ${post.id}:`, error);
            }
          }
        }

        return { newPosts: totalNewPosts, duplicatesSkipped: totalDuplicatesSkipped };
      });

      // Step 3: Scrape comments
      const commentsResult = await step.run("scrape-comments", async () => {
        if (scrapeType === 'posts_only') {
          return { newComments: 0, duplicatesSkipped: 0 };
        }

        console.log(`[USER_SCRAPE] Scraping comments for u/${username}`);
        
        let totalNewComments = 0;
        let totalDuplicatesSkipped = 0;

        const comments = await redditUserScraper.fetchAllUserComments(username, {
          maxComments: limit || 1000,
          sort: 'new',
          t: timeframe as 'all' | 'year' | 'month' | 'week' | 'day',
          onProgress: (progress) => {
            console.log(`[USER_SCRAPE] Comments progress: ${progress.fetched}/${progress.total || 'unknown'}`);
          }
        });

        console.log(`[USER_SCRAPE] Found ${comments.length} comments to process`);

        // Process comments in batches
        const batchSize = 50;
        for (let i = 0; i < comments.length; i += batchSize) {
          const batch = comments.slice(i, i + batchSize);
          
          for (const comment of batch) {
            try {
              // Check if comment already exists
              const existing = await prisma.redditUserComment.findUnique({
                where: { redditId: comment.id },
              });

              if (existing) {
                totalDuplicatesSkipped++;
                continue;
              }

              // Create new comment
              await prisma.redditUserComment.create({
                data: {
                  userId: user.id,
                  redditId: comment.id,
                  body: comment.body,
                  permalink: comment.permalink,
                  subreddit: comment.subreddit,
                  author: comment.author,
                  score: comment.score,
                  createdUtc: new Date(comment.created_utc * 1000),
                  postId: comment.link_id.replace('t3_', ''), // Remove prefix
                  postTitle: comment.link_title,
                  parentId: comment.parent_id,
                  isTopLevel: comment.parent_id.startsWith('t3_'), // Top level if parent is post
                  isSubmitter: comment.is_submitter,
                  scoreHidden: comment.score_hidden,
                  edited: !!comment.edited,
                  rawData: comment as unknown as Prisma.InputJsonValue,
                },
              });

              totalNewComments++;
            } catch (error) {
              console.error(`[USER_SCRAPE] Error processing comment ${comment.id}:`, error);
            }
          }
        }

        return { newComments: totalNewComments, duplicatesSkipped: totalDuplicatesSkipped };
      });

      // Step 4: Update user and job status
      await step.run("update-completion-status", async () => {
        await prisma.redditUser.update({
          where: { id: user.id },
          data: {
            scrapingStatus: 'completed',
            scrapingCompleted: new Date(),
            lastScraped: new Date(),
            postsScraped: { increment: postsResult.newPosts },
            commentsScraped: { increment: commentsResult.newComments },
            scrapingError: null,
          },
        });

        await prisma.userScrapingJob.updateMany({
          where: { userId: user.id, status: 'in_progress' },
          data: {
            status: 'completed',
            completedAt: new Date(),
            newPosts: postsResult.newPosts,
            newComments: commentsResult.newComments,
            duplicatesSkipped: postsResult.duplicatesSkipped + commentsResult.duplicatesSkipped,
          },
        });
      });

      console.log(`[USER_SCRAPE] Completed scraping for u/${username}`);
      return {
        username,
        postsResult,
        commentsResult,
        success: true,
      };

    } catch (error) {
      // Step 5: Handle errors
      await step.run("handle-error", async () => {
        await prisma.redditUser.update({
          where: { id: user.id },
          data: {
            scrapingStatus: 'failed',
            scrapingCompleted: new Date(),
            scrapingError: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        await prisma.userScrapingJob.updateMany({
          where: { userId: user.id, status: 'in_progress' },
          data: {
            status: 'failed',
            completedAt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      });

      console.error(`[USER_SCRAPE] Failed scraping for u/${username}:`, error);
      throw error;
    }
  }
);

export const analyzeUserActivity = inngest.createFunction(
  {
    id: "analyze-user-activity",
    retries: 2,
    rateLimit: {
      limit: 5,
      period: "1m"
    }
  },
  { event: "reddit/analyze.user-activity" },
  async ({ event, step }) => {
    const { username, userId, limit } = event.data;
    console.log(`[USER_ANALYSIS] Starting analysis for u/${username}`);

    // Step 1: Get user and items to analyze
    const analysisData = await step.run("get-analysis-data", async () => {
      const user = await prisma.redditUser.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NonRetriableError(`User not found: ${userId}`);
      }

      // Get unanalyzed comments
      const comments = await prisma.redditUserComment.findMany({
        where: { 
          userId: user.id,
          analyzed: false,
          body: { not: { in: ['[deleted]', '[removed]'] } },
        },
        orderBy: { createdUtc: 'desc' },
        take: limit || 1000,
      });

      console.log(`[USER_ANALYSIS] Found ${comments.length} comments to analyze`);
      return { user, comments };
    });

    try {
      // Step 2: Analyze comments for opportunities
      const analysisResults = await step.run("analyze-comments", async () => {
        const { comments } = analysisData;
        
        if (comments.length === 0) {
          return { opportunitiesFound: 0, commentsAnalyzed: 0 };
        }

        const analyzer = new Delta4Analyzer(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
        let opportunitiesFound = 0;
        let commentsAnalyzed = 0;

        // Analyze comments in batches
        const batchSize = 10;
        for (let i = 0; i < comments.length; i += batchSize) {
          const batch = comments.slice(i, i + batchSize);
          
          for (const comment of batch) {
            try {
              // Analyze comment for opportunities
              const analysis = await analyzer.analyzeOpportunity({
                postTitle: `Comment by u/${comment.author} in r/${comment.subreddit}`,
                postContent: comment.body,
                subreddit: comment.subreddit,
                author: comment.author,
                score: comment.score,
                numComments: 0,
              }, {
                trackCosts: true,
                redditPostId: `user_comment_${comment.redditId}`,
                sessionData: {
                  sessionId: `user_analysis_${username}`,
                  sessionType: 'batch',
                  triggeredBy: 'user-activity-analysis',
                  subreddit: comment.subreddit,
                  postsRequested: comments.length,
                },
              });

              // Update comment analysis status
              await prisma.redditUserComment.update({
                where: { id: comment.id },
                data: {
                  analyzed: true,
                  analysisDate: new Date(),
                  isOpportunity: analysis.isOpportunity,
                },
              });

              commentsAnalyzed++;

              // Create opportunity if found
              if (analysis.isOpportunity && analysis.opportunity) {
                const opportunity = await prisma.opportunity.create({
                  data: {
                    title: analysis.opportunity.title,
                    description: analysis.opportunity.description,
                    currentSolution: analysis.opportunity.currentSolution,
                    proposedSolution: analysis.opportunity.proposedSolution,
                    marketContext: analysis.opportunity.marketContext,
                    implementationNotes: analysis.opportunity.implementationNotes,
                    
                    // Delta 4 scores
                    speedScore: analysis.opportunity.delta4Scores.speed,
                    convenienceScore: analysis.opportunity.delta4Scores.convenience,
                    trustScore: analysis.opportunity.delta4Scores.trust,
                    priceScore: analysis.opportunity.delta4Scores.price,
                    statusScore: analysis.opportunity.delta4Scores.status,
                    predictabilityScore: analysis.opportunity.delta4Scores.predictability,
                    uiUxScore: analysis.opportunity.delta4Scores.uiUx,
                    easeOfUseScore: analysis.opportunity.delta4Scores.easeOfUse,
                    legalFrictionScore: analysis.opportunity.delta4Scores.legalFriction,
                    emotionalComfortScore: analysis.opportunity.delta4Scores.emotionalComfort,
                    
                    overallScore: analysis.opportunity.overallScore,
                    viabilityThreshold: analysis.opportunity.viabilityThreshold,
                    
                    subreddit: comment.subreddit,
                    marketSize: analysis.opportunity.marketSize,
                    complexity: analysis.opportunity.complexity,
                    successProbability: analysis.opportunity.successProbability,
                    
                    // Categories
                    businessType: analysis.opportunity.categories.businessType,
                    businessModel: analysis.opportunity.categories.businessModel,
                    revenueModel: analysis.opportunity.categories.revenueModel,
                    pricingModel: analysis.opportunity.categories.pricingModel,
                    platform: analysis.opportunity.categories.platform,
                    mobileSupport: analysis.opportunity.categories.mobileSupport,
                    deploymentType: analysis.opportunity.categories.deploymentType,
                    developmentType: analysis.opportunity.categories.developmentType,
                    targetAudience: analysis.opportunity.categories.targetAudience,
                    userType: analysis.opportunity.categories.userType,
                    technicalLevel: analysis.opportunity.categories.technicalLevel,
                    ageGroup: analysis.opportunity.categories.ageGroup,
                    geography: analysis.opportunity.categories.geography,
                    marketType: analysis.opportunity.categories.marketType,
                    economicLevel: analysis.opportunity.categories.economicLevel,
                    industryVertical: analysis.opportunity.categories.industryVertical,
                    niche: analysis.opportunity.categories.niche,
                    developmentComplexity: analysis.opportunity.categories.developmentComplexity,
                    teamSize: analysis.opportunity.categories.teamSize,
                    capitalRequirement: analysis.opportunity.categories.capitalRequirement,
                    developmentTime: analysis.opportunity.categories.developmentTime,
                    marketSizeCategory: analysis.opportunity.categories.marketSizeCategory,
                    competitionLevel: analysis.opportunity.categories.competitionLevel,
                    marketTrend: analysis.opportunity.categories.marketTrend,
                    growthPotential: analysis.opportunity.categories.growthPotential,
                    acquisitionStrategy: analysis.opportunity.categories.acquisitionStrategy,
                    scalabilityType: analysis.opportunity.categories.scalabilityType,
                    
                    // Market validation
                    marketValidationScore: analysis.opportunity.marketValidation.marketValidationScore,
                    engagementLevel: analysis.opportunity.marketValidation.engagementLevel,
                    problemFrequency: analysis.opportunity.marketValidation.problemFrequency,
                    customerType: analysis.opportunity.marketValidation.customerType,
                    paymentWillingness: analysis.opportunity.marketValidation.paymentWillingness,
                    competitiveAnalysis: analysis.opportunity.marketValidation.competitiveAnalysis,
                    validationTier: analysis.opportunity.marketValidation.validationTier,
                  },
                });

                // Link opportunity to comment
                await prisma.redditUserComment.update({
                  where: { id: comment.id },
                  data: { opportunityId: opportunity.id },
                });

                opportunitiesFound++;
                console.log(`[USER_ANALYSIS] Found opportunity: ${opportunity.title}`);
              }
            } catch (error) {
              console.error(`[USER_ANALYSIS] Error analyzing comment ${comment.id}:`, error);
              // Mark as analyzed even if failed to prevent reprocessing
              await prisma.redditUserComment.update({
                where: { id: comment.id },
                data: { analyzed: true, analysisDate: new Date() },
              });
            }
          }
        }

        return { opportunitiesFound, commentsAnalyzed };
      });

      // Step 3: Update user analysis status
      await step.run("update-analysis-status", async () => {
        await prisma.redditUser.update({
          where: { id: userId },
          data: {
            analysisStatus: 'completed',
            analysisCompleted: new Date(),
            opportunitiesFound: { increment: analysisResults.opportunitiesFound },
            analysisError: null,
          },
        });
      });

      console.log(`[USER_ANALYSIS] Completed analysis for u/${username}`);
      return {
        username,
        analysisResults,
        success: true,
      };

    } catch (error) {
      // Step 4: Handle errors
      await step.run("handle-analysis-error", async () => {
        await prisma.redditUser.update({
          where: { id: userId },
          data: {
            analysisStatus: 'failed',
            analysisCompleted: new Date(),
            analysisError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      });

      console.error(`[USER_ANALYSIS] Failed analysis for u/${username}:`, error);
      throw error;
    }
  }
);

// Opportunity clustering function
export const clusterOpportunities = inngest.createFunction(
  { 
    id: "cluster-opportunities",
    retries: 2,
    rateLimit: {
      limit: 10,
      period: "1h"
    }
  },
  { event: "opportunities/cluster" },
  async ({ event, step }) => {
    const { forceRecalculate = false } = event.data;
    console.log(`[CLUSTERING] Starting opportunity clustering (force: ${forceRecalculate})`);

    // Import clustering engine
    const { opportunityClusteringEngine } = await import("@/opportunities");

    // Step 1: Cluster similar opportunities
    const clusters = await step.run("cluster-similar-opportunities", async () => {
      console.log(`[CLUSTERING] Running semantic clustering analysis`);
      const result = await opportunityClusteringEngine.clusterSimilarOpportunities();
      console.log(`[CLUSTERING] Generated ${result.length} opportunity clusters`);
      return result;
    });

    // Step 2: Generate frequently requested ideas analysis
    const topRequested = await step.run("get-top-requested-ideas", async () => {
      console.log(`[CLUSTERING] Analyzing top requested ideas`);
      const result = await opportunityClusteringEngine.getTopRequestedIdeas(50);
      console.log(`[CLUSTERING] Found ${result.clusters.length} top requested idea clusters`);
      return result;
    });

    // Step 3: Update demand signal clusters
    await step.run("update-demand-signals", async () => {
      console.log(`[CLUSTERING] Processing demand signals for ${clusters.length} clusters`);
      
      for (const cluster of clusters) {
        if (cluster.sourceCount >= 3) { // Only process clusters with significant demand
          const signals = await clusteringEngine.extractDemandSignals(
            cluster.title,
            cluster.description,
            cluster.opportunities[0]?.subreddit || 'general',
            cluster.opportunities[0]?.id || '',
            'clustering-system',
            cluster.sourceCount
          );

          for (const signal of signals) {
            await clusteringEngine.processNewSignal(signal);
          }
        }
      }
      
      console.log(`[CLUSTERING] Updated demand signals for high-demand clusters`);
    });

    // Step 4: Calculate clustering metrics and insights
    const metrics = await step.run("calculate-clustering-metrics", async () => {
      const totalOpportunities = await prisma.opportunity.count();
      const clusteredOpportunities = clusters.reduce((sum, cluster) => sum + cluster.opportunities.length, 0);
      const clusteringRate = (clusteredOpportunities / totalOpportunities) * 100;
      
      const crossSubredditClusters = clusters.filter(cluster => cluster.subreddits.length > 1).length;
      const highDemandClusters = clusters.filter(cluster => cluster.sourceCount >= 5).length;
      const viableOpportunityClusters = clusters.filter(cluster => 
        cluster.totalViability / cluster.opportunities.length > 0.5
      ).length;
      
      const avgClusterSize = clusters.length > 0 ? clusteredOpportunities / clusters.length : 0;
      const avgTrendingScore = clusters.length > 0 ? 
        clusters.reduce((sum, cluster) => sum + cluster.trendingScore, 0) / clusters.length : 0;

      return {
        totalOpportunities,
        clusteredOpportunities,
        clusteringRate,
        totalClusters: clusters.length,
        crossSubredditClusters,
        highDemandClusters,
        viableOpportunityClusters,
        avgClusterSize,
        avgTrendingScore,
      };
    });

    console.log(`[CLUSTERING] Completed clustering analysis:`, {
      clusters: clusters.length,
      topRequested: topRequested.clusters.length,
      metrics: metrics
    });

    return {
      success: true,
      clusters: clusters.slice(0, 20), // Return top 20 clusters
      topRequested: topRequested.clusters.slice(0, 10), // Return top 10 requested
      metrics,
      summary: topRequested.summary,
      timestamp: new Date().toISOString(),
    };
  }
);

