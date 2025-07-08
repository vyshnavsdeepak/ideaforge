import { inngest } from "../lib/inngest";
import { RedditClient, TARGET_SUBREDDITS } from "../lib/reddit";
import { Delta4Analyzer } from "../lib/ai";
import { prisma } from "../lib/prisma";

export const scrapeSubreddit = inngest.createFunction(
  { id: "scrape-subreddit" },
  { event: "reddit/scrape.subreddit" },
  async ({ event, step }) => {
    const { subreddit, limit = 25 } = event.data;
    console.log(`[SCRAPE] Starting scrape for r/${subreddit} with limit ${limit}`);

    const posts = await step.run("fetch-reddit-posts", async () => {
      console.log(`[SCRAPE] Fetching posts from r/${subreddit}`);
      const client = new RedditClient();
      const result = await client.fetchSubredditPosts(subreddit, "hot", limit);
      console.log(`[SCRAPE] Fetched ${result.length} posts from r/${subreddit}`);
      return result;
    });

    const storedPosts = await step.run("store-reddit-posts", async () => {
      console.log(`[SCRAPE] Processing ${posts.length} posts for storage`);
      const newPosts = [];
      
      for (const post of posts) {
        console.log(`[SCRAPE] Checking if post ${post.redditId} exists...`);
        const existing = await prisma.redditPost.findUnique({
          where: { redditId: post.redditId }
        });
        
        if (!existing) {
          console.log(`[SCRAPE] Storing new post: ${post.title.substring(0, 50)}...`);
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
        } else {
          console.log(`[SCRAPE] Post ${post.redditId} already exists, skipping`);
        }
      }
      
      console.log(`[SCRAPE] Stored ${newPosts.length} new posts`);
      return newPosts;
    });

    if (storedPosts.length > 0) {
      await step.run("trigger-ai-analysis", async () => {
        console.log(`[SCRAPE] Triggering AI analysis for ${storedPosts.length} posts`);
        for (const post of storedPosts) {
          console.log(`[SCRAPE] Sending AI analysis event for post: ${post.title.substring(0, 50)}...`);
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
  { id: "analyze-opportunity" },
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
    });

    if (analysis.isOpportunity && analysis.opportunity) {
      const opportunity = await step.run("store-opportunity", async () => {
        const { opportunity: opp } = analysis;
        
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
        overallScore: analysis.opportunity.overallScore,
        viable: analysis.opportunity.viabilityThreshold
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
      reason: analysis.reasons?.[0] || "No opportunity identified" 
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