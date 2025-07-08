import { inngest } from "../lib/inngest";
import { RedditClient, TARGET_SUBREDDITS } from "../lib/reddit";
import { Delta4Analyzer } from "../lib/ai";
import { prisma } from "../lib/prisma";
import { 
  checkRedditPostDuplication, 
  checkOpportunityDuplication, 
  updateRedditPost 
} from "../lib/deduplication";

export const scrapeSubreddit = inngest.createFunction(
  { 
    id: "scrape-subreddit",
    retries: 3
  },
  { event: "reddit/scrape.subreddit" },
  async ({ event, step }) => {
    const { subreddit, limit = 25, sort = 'hot', priority = 'normal' } = event.data;
    console.log(`[SCRAPE] Starting scrape for r/${subreddit} with limit ${limit}, sort ${sort}, priority ${priority}`);

    const posts = await step.run("fetch-reddit-posts", async () => {
      console.log(`[SCRAPE] Fetching ${sort} posts from r/${subreddit}`);
      const client = new RedditClient();
      const result = await client.fetchSubredditPosts(subreddit, sort, limit);
      console.log(`[SCRAPE] Fetched ${result.length} posts from r/${subreddit}`);
      return result;
    });

    const storedPosts = await step.run("store-reddit-posts", async () => {
      console.log(`[SCRAPE] Processing ${posts.length} posts for storage with enhanced deduplication`);
      const newPosts = [];
      const updatedPosts = [];
      const skippedPosts = [];
      
      for (const post of posts) {
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
      
      return newPosts;
    });

    if (storedPosts.length > 0) {
      await step.run("trigger-ai-analysis", async () => {
        console.log(`[SCRAPE] Triggering AI analysis for ${storedPosts.length} posts`);
        for (let i = 0; i < storedPosts.length; i++) {
          const post = storedPosts[i];
          console.log(`[SCRAPE] Sending AI analysis event for post ${i + 1}/${storedPosts.length}: ${post.title.substring(0, 50)}...`);
          
          await inngest.send({
            name: "ai/analyze.opportunity",
            data: {
              postId: post.id,
              postTitle: post.title,
              postContent: post.content,
              subreddit: post.subreddit,
              author: post.author,
              score: post.score,
              numComments: post.numComments,
            }
          });
          
          // Add delay between requests to prevent rate limiting
          if (i < storedPosts.length - 1) {
            console.log(`[SCRAPE] Waiting 2 seconds before next AI analysis trigger...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        console.log(`[SCRAPE] All AI analysis events sent`);
      });
    } else {
      console.log(`[SCRAPE] No new posts to analyze`);
    }

    const result = { 
      subreddit, 
      totalPosts: posts.length, 
      newPosts: storedPosts.length 
    };
    console.log(`[SCRAPE] Completed scrape:`, result);
    return result;
  }
);

export const analyzeOpportunity = inngest.createFunction(
  { 
    id: "analyze-opportunity",
    retries: 5,
    rateLimit: {
      limit: 10,
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
        throw new Error("Google AI API key not configured");
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
          opp.proposedSolution
        );
        
        if (duplicationResult.isDuplicate) {
          console.log(`[AI] Opportunity is duplicate: ${duplicationResult.reason}`);
          if (duplicationResult.similarityScore) {
            console.log(`[AI] Similarity score: ${duplicationResult.similarityScore.toFixed(2)}`);
          }
          
          // Return the existing opportunity ID instead of creating a new one
          const existingOpportunity = await prisma.opportunity.findUnique({
            where: { id: duplicationResult.existingId! }
          });
          
          if (existingOpportunity) {
            console.log(`[AI] Returning existing opportunity: ${existingOpportunity.title}`);
            return existingOpportunity;
          }
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
            
            redditPostId: postId,
          }
        });
      });

      await step.run("mark-post-processed", async () => {
        await prisma.redditPost.update({
          where: { id: postId },
          data: { processedAt: new Date() }
        });
      });

      return { 
        success: true, 
        opportunityId: opportunity.id,
        overallScore: analysis.opportunity?.overallScore || 0,
        viable: analysis.opportunity?.viabilityThreshold || false
      };
    }

    await step.run("mark-post-processed", async () => {
      await prisma.redditPost.update({
        where: { id: postId },
        data: { processedAt: new Date() }
      });
    });

    return { 
      success: false, 
      reason: analysis?.reasons?.[0] || "No opportunity identified" 
    };
  }
);

export const dailyRedditScrape = inngest.createFunction(
  { id: "daily-reddit-scrape" },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const results = await step.run("trigger-subreddit-scraping", async () => {
      const promises = TARGET_SUBREDDITS.map(subreddit => 
        inngest.send({
          name: "reddit/scrape.subreddit",
          data: {
            subreddit,
            limit: 25,
          }
        })
      );

      await Promise.all(promises);
      return { 
        subredditsTriggered: TARGET_SUBREDDITS.length 
      };
    });

    return results;
  }
);