import { inngest } from "../lib/inngest";
import { RedditClient, TARGET_SUBREDDITS } from "../lib/reddit";
import { Delta4Analyzer } from "../lib/ai";
import { prisma } from "../lib/prisma";

export const scrapeSubreddit = inngest.createFunction(
  { id: "scrape-subreddit" },
  { event: "reddit/scrape.subreddit" },
  async ({ event, step }) => {
    const { subreddit, limit = 25 } = event.data;

    const posts = await step.run("fetch-reddit-posts", async () => {
      const client = new RedditClient();
      return await client.fetchSubredditPosts(subreddit, "hot", limit);
    });

    const storedPosts = await step.run("store-reddit-posts", async () => {
      const newPosts = [];
      
      for (const post of posts) {
        const existing = await prisma.redditPost.findUnique({
          where: { redditId: post.redditId }
        });
        
        if (!existing) {
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
        }
      }
      
      return newPosts;
    });

    if (storedPosts.length > 0) {
      await step.run("trigger-ai-analysis", async () => {
        for (const post of storedPosts) {
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
      });
    }

    return { 
      subreddit, 
      totalPosts: posts.length, 
      newPosts: storedPosts.length 
    };
  }
);

export const analyzeOpportunity = inngest.createFunction(
  { id: "analyze-opportunity" },
  { event: "ai/analyze.opportunity" },
  async ({ event, step }) => {
    const { postId, postTitle, postContent, subreddit, author, score, numComments } = event.data;

    const analysis = await step.run("ai-analysis", async () => {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const analyzer = new Delta4Analyzer(openaiApiKey);
      return await analyzer.analyzeOpportunity({
        postTitle,
        postContent,
        subreddit,
        author,
        score,
        numComments,
      });
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