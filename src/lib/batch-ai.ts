import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { opportunitySchema } from './ai';

export interface BatchAnalysisRequest {
  id: string;
  postId: string;
  postTitle: string;
  postContent: string;
  subreddit: string;
  author: string;
  score: number;
  numComments: number;
}

export interface BatchAnalysisResult {
  id: string;
  postId: string;
  success: boolean;
  analysis?: unknown;
  error?: string;
}

const batchAnalysisSchema = z.object({
  analyses: z.array(
    z.object({
      id: z.string(),
      postId: z.string(),
      success: z.boolean(),
      analysis: z.object({
        isOpportunity: z.boolean(),
        confidence: z.number(),
        opportunity: z.object({
          title: z.string(),
          description: z.string(),
          proposedSolution: z.string(),
          marketContext: z.string().optional(),
          implementationNotes: z.string().optional(),
          delta4Scores: z.object({
            speed: z.number(),
            convenience: z.number(),
            trust: z.number(),
            price: z.number(),
            status: z.number(),
            predictability: z.number(),
            uiUx: z.number(),
            easeOfUse: z.number(),
            legalFriction: z.number(),
            emotionalComfort: z.number(),
          }),
          marketSize: z.enum(['Small', 'Medium', 'Large', 'Unknown']),
          complexity: z.enum(['Low', 'Medium', 'High']),
          successProbability: z.enum(['Low', 'Medium', 'High']),
          categories: z.object({
            businessType: z.string(),
            businessModel: z.string(),
            revenueModel: z.string(),
            pricingModel: z.string(),
            platform: z.string(),
            mobileSupport: z.string(),
            deploymentType: z.string(),
            developmentType: z.string(),
            targetAudience: z.string(),
            userType: z.string(),
            technicalLevel: z.string(),
            ageGroup: z.string(),
            geography: z.string(),
            marketType: z.string(),
            economicLevel: z.string(),
            industryVertical: z.string(),
            niche: z.string(),
            developmentComplexity: z.string(),
            teamSize: z.string(),
            capitalRequirement: z.string(),
            developmentTime: z.string(),
            marketSizeCategory: z.string(),
            competitionLevel: z.string(),
            marketTrend: z.string(),
            growthPotential: z.string(),
            acquisitionStrategy: z.string(),
            scalabilityType: z.string(),
          }),
          reasoning: z.object({
            speed: z.string(),
            convenience: z.string(),
            trust: z.string(),
            price: z.string(),
            status: z.string(),
            predictability: z.string(),
            uiUx: z.string(),
            easeOfUse: z.string(),
            legalFriction: z.string(),
            emotionalComfort: z.string(),
          }),
        }).optional(),
        reasons: z.array(z.string()).optional(),
      }).optional(),
      error: z.string().optional(),
    })
  )
});


/**
 * Analyze multiple Reddit posts in a single batch request
 */
export async function batchAnalyzeOpportunities(
  requests: BatchAnalysisRequest[],
  maxBatchSize: number = 10
): Promise<BatchAnalysisResult[]> {
  const results: BatchAnalysisResult[] = [];
  
  // Process in batches to avoid token limits
  for (let i = 0; i < requests.length; i += maxBatchSize) {
    const batch = requests.slice(i, i + maxBatchSize);
    console.log(`[BATCH_AI] Processing batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(requests.length / maxBatchSize)} with ${batch.length} posts`);
    
    try {
      const batchResults = await processBatch(batch);
      results.push(...batchResults);
    } catch (error) {
      console.error(`[BATCH_AI] Batch processing failed:`, error);
      
      // Fall back to individual processing for failed batch
      for (const request of batch) {
        try {
          const individualResult = await processIndividualPost(request);
          results.push(individualResult);
        } catch (individualError) {
          console.error(`[BATCH_AI] Individual fallback failed for post ${request.postId}:`, individualError);
          results.push({
            id: request.id,
            postId: request.postId,
            success: false,
            error: `Batch and individual processing failed: ${individualError}`
          });
        }
      }
    }
  }
  
  return results;
}

/**
 * Process a single batch of posts
 */
async function processBatch(batch: BatchAnalysisRequest[]): Promise<BatchAnalysisResult[]> {
  const postsData = batch.map(req => ({
    id: req.id,
    postId: req.postId,
    title: req.postTitle,
    content: req.postContent,
    subreddit: req.subreddit,
    author: req.author,
    score: req.score,
    numComments: req.numComments
  }));

  const prompt = `
You are an expert business analyst specializing in AI opportunities and Kunal Shah's Delta 4 theory.

I will provide you with ${batch.length} Reddit posts to analyze. For each post, determine if it represents a genuine business opportunity and provide a detailed analysis.

IMPORTANT: Return exactly ${batch.length} analyses in the same order as the input posts. If a post doesn't contain a business opportunity, still provide an analysis but mark it appropriately.

Here are the posts to analyze:

${postsData.map((post, index) => `
POST ${index + 1}:
ID: ${post.id}
Post ID: ${post.postId}
Title: ${post.title}
Content: ${post.content}
Subreddit: r/${post.subreddit}
Author: ${post.author}
Score: ${post.score}
Comments: ${post.numComments}
---
`).join('\n')}

For each post, provide:
1. A clear business opportunity title (or "No Clear Opportunity" if none exists)
2. Detailed analysis of the problem and solution
3. Delta 4 scores (0-10) for all 10 dimensions
4. Market size assessment
5. Implementation complexity
6. Success probability
7. Categorization across all business dimensions
8. Detailed reasoning for each Delta 4 score

Return the analyses in the exact same order as the input posts.
`;

  const result = await generateObject({
    model: google('gemini-2.0-flash-exp'),
    schema: batchAnalysisSchema,
    prompt,
    temperature: 0.7,
  });

  return result.object.analyses.map(analysis => ({
    id: analysis.id,
    postId: analysis.postId,
    success: analysis.success,
    analysis: analysis.analysis || null,
    error: analysis.error,
  }));
}

/**
 * Fallback: Process a single post individually
 */
async function processIndividualPost(request: BatchAnalysisRequest): Promise<BatchAnalysisResult> {
  const prompt = `
You are an expert business analyst specializing in AI opportunities and Kunal Shah's Delta 4 theory.

Analyze this Reddit post for business opportunities:

Title: ${request.postTitle}
Content: ${request.postContent}
Subreddit: r/${request.subreddit}
Author: ${request.author}
Score: ${request.score}
Comments: ${request.numComments}

Provide a detailed analysis including Delta 4 scores, market assessment, and implementation guidance.
`;

  const result = await generateObject({
    model: google('gemini-2.0-flash-exp'),
    schema: opportunitySchema,
    prompt,
    temperature: 0.7,
  });

  return {
    id: request.id,
    postId: request.postId,
    success: true,
    analysis: result.object
  };
}

/**
 * Convert batch results to individual opportunity analyses
 */
export function processBatchResults(results: BatchAnalysisResult[]): Array<{
  postId: string;
  success: boolean;
  analysis?: unknown;
  error?: string;
}> {
  return results.map(result => ({
    postId: result.postId,
    success: result.success,
    analysis: result.analysis,
    error: result.error
  }));
}