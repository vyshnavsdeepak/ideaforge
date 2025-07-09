import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { opportunitySchema, AIAnalysisResponse, Delta4Score } from './ai';
import { AIWithCostTracking } from './ai-with-cost-tracking';
import { AIAnalysisSessionData } from './ai-cost-tracking';
import { randomUUID } from 'crypto';

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
  analysis?: AIAnalysisResponse;
  error?: string;
}

function calculateOverallScore(scores: Delta4Score): number {
  const weights = {
    speed: 0.15,
    convenience: 0.15,
    trust: 0.12,
    price: 0.1,
    status: 0.08,
    predictability: 0.1,
    uiUx: 0.1,
    easeOfUse: 0.1,
    legalFriction: 0.05,
    emotionalComfort: 0.05,
  };

  let weightedSum = 0;
  Object.entries(weights).forEach(([key, weight]) => {
    weightedSum += (scores[key as keyof Delta4Score] || 0) * weight;
  });

  return Math.round(weightedSum * 100) / 100;
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
          currentSolution: z.string().optional(),
          proposedSolution: z.string(),
          marketContext: z.string().optional(),
          implementationNotes: z.string().optional(),
          delta4Scores: z.object({
            speed: z.number().min(0).max(10),
            convenience: z.number().min(0).max(10),
            trust: z.number().min(0).max(10),
            price: z.number().min(0).max(10),
            status: z.number().min(0).max(10),
            predictability: z.number().min(0).max(10),
            uiUx: z.number().min(0).max(10),
            easeOfUse: z.number().min(0).max(10),
            legalFriction: z.number().min(0).max(10),
            emotionalComfort: z.number().min(0).max(10),
          }),
          overallScore: z.number(),
          viabilityThreshold: z.boolean(),
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
          marketValidation: z.object({
            marketValidationScore: z.number().min(0).max(10),
            engagementLevel: z.enum(['Low', 'Medium', 'High', 'Unknown']),
            problemFrequency: z.enum(['Rare', 'Occasional', 'Frequent', 'Very Frequent', 'Unknown']),
            customerType: z.enum(['Individual', 'Business', 'Both', 'Unknown']),
            paymentWillingness: z.enum(['Low', 'Medium', 'High', 'Unknown']),
            competitiveAnalysis: z.enum(['No Competition', 'Low Competition', 'Medium Competition', 'High Competition', 'Unknown']),
            validationTier: z.enum(['Tier 1 (Build Now)', 'Tier 2 (Validate Further)', 'Tier 3 (Monitor)', 'Unknown']),
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
 * Analyze multiple Reddit posts in a single batch request with cost tracking
 */
export async function batchAnalyzeOpportunities(
  requests: BatchAnalysisRequest[],
  maxBatchSize: number = 10,
  sessionData?: AIAnalysisSessionData
): Promise<{
  results: BatchAnalysisResult[];
  totalCost: { inputCost: number; outputCost: number; totalCost: number };
  sessionId: string;
}> {
  const sessionId = sessionData?.sessionId || randomUUID();
  const aiSession: AIAnalysisSessionData = sessionData || {
    sessionId,
    sessionType: 'batch',
    triggeredBy: 'batch-analysis',
    subreddit: requests[0]?.subreddit || 'unknown',
    postsRequested: requests.length,
  };

  const ai = new AIWithCostTracking(aiSession);
  await ai.startSession(aiSession);

  const results: BatchAnalysisResult[] = [];
  const totalCost = { inputCost: 0, outputCost: 0, totalCost: 0 };
  let opportunitiesFound = 0;
  let errorCount = 0;

  try {
    // Process in batches to avoid token limits
    for (let i = 0; i < requests.length; i += maxBatchSize) {
      const batch = requests.slice(i, i + maxBatchSize);
      console.log(`[BATCH_AI] Processing batch ${Math.floor(i / maxBatchSize) + 1}/${Math.ceil(requests.length / maxBatchSize)} with ${batch.length} posts`);
      
      try {
        const batchResults = await processBatchWithCostTracking(batch, ai);
        results.push(...batchResults.results);
        
        // Add to total cost
        totalCost.inputCost += batchResults.cost.inputCost;
        totalCost.outputCost += batchResults.cost.outputCost;
        totalCost.totalCost += batchResults.cost.totalCost;
        
        // Count opportunities and errors
        opportunitiesFound += batchResults.results.filter(r => r.success && r.analysis?.isOpportunity).length;
        errorCount += batchResults.results.filter(r => !r.success).length;
      } catch (error) {
        console.error(`[BATCH_AI] Batch processing failed:`, error);
        
        // Fall back to individual processing for failed batch
        for (const request of batch) {
          try {
            const individualResult = await processIndividualPostWithCostTracking(request, ai);
            results.push(individualResult.result);
            
            // Add to total cost
            totalCost.inputCost += individualResult.cost.inputCost;
            totalCost.outputCost += individualResult.cost.outputCost;
            totalCost.totalCost += individualResult.cost.totalCost;
            
            if (individualResult.result.success && individualResult.result.analysis?.isOpportunity) {
              opportunitiesFound++;
            } else {
              errorCount++;
            }
          } catch (individualError) {
            console.error(`[BATCH_AI] Individual fallback failed for post ${request.postId}:`, individualError);
            results.push({
              id: request.id,
              postId: request.postId,
              success: false,
              error: `Batch and individual processing failed: ${individualError}`
            });
            errorCount++;
          }
        }
      }
    }

    console.log(`[BATCH_AI] Batch analysis completed: ${results.length} posts processed, ${opportunitiesFound} opportunities found, total cost: $${totalCost.totalCost.toFixed(6)}`);
    
    return {
      results,
      totalCost,
      sessionId,
    };
  } finally {
    // Finalize session
    await ai.finishSession({
      postsProcessed: results.length,
      opportunitiesFound,
      errorCount,
      endTime: new Date(),
    });
  }
}

/**
 * Process a single batch of posts
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _processBatch(batch: BatchAnalysisRequest[]): Promise<BatchAnalysisResult[]> {
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

**Delta 4 Theory:** A business needs 4+ improvement delta across: Speed, Convenience, Trust, Price, Status, Predictability, UI/UX, Ease of Use, Legal Friction, Emotional Comfort (scored 0-10).

**Example Analysis:**
- Reddit Post: "I spend hours manually scheduling social media posts for my clients. It's repetitive and I often forget to post at optimal times."
- Opportunity: AI-powered social media scheduling with optimal timing
- Delta 4 Scores: Speed: 8, Convenience: 9, Trust: 6, Price: 7, Status: 5, Predictability: 8, UI/UX: 7, Ease of Use: 8, Legal Friction: 9, Emotional Comfort: 7
- Average: 7.4/10 → Viable opportunity

**Anti-Patterns (Not Viable):**
- Vague complaints without specific problems
- Problems too trivial for AI solutions
- Policy/regulatory issues without business angle

**Task:** Analyze ${batch.length} Reddit posts for AI business opportunities.

**CRITICAL:** Return exactly ${batch.length} analyses in the same order as input posts.

**Posts to Analyze:**

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

**Analysis Requirements:**
For each post, provide:
1. **Problem Identification:** Core issue mentioned in the post
2. **AI Solution:** Specific AI-driven solution proposal
3. **Delta 4 Analysis:** Score each dimension (0-10) with brief reasoning
4. **Business Viability:** Market size, complexity, success probability
5. **Categorization:** Business type, revenue model, platform, industry, niche, target audience, capital requirements
6. **Overall Assessment:** Average Delta 4 score and viability conclusion

**Quality Standards:**
- Focus on clear, specific problems with customer pain
- Ensure AI provides substantial (4+) improvement
- Reference specific content from the Reddit post
- Use business logic for all categorizations
- Maintain consistent analysis depth across all posts

Return analyses in the exact same order as the input posts.
`;

  const result = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: batchAnalysisSchema,
    prompt,
    temperature: 0.3,
  });

  return result.object.analyses.map(analysis => {
    // Transform the analysis to match AIAnalysisResponse format
    const transformedAnalysis = analysis.analysis ? {
      isOpportunity: analysis.analysis.isOpportunity,
      confidence: analysis.analysis.confidence,
      opportunity: analysis.analysis.opportunity ? {
        ...analysis.analysis.opportunity,
        // Calculate overall score from delta4Scores
        overallScore: calculateOverallScore(analysis.analysis.opportunity.delta4Scores),
        // Set viability threshold based on overall score
        viabilityThreshold: calculateOverallScore(analysis.analysis.opportunity.delta4Scores) >= 4.0,
        // Ensure marketValidation is present with defaults if missing
        marketValidation: analysis.analysis.opportunity.marketValidation || {
          marketValidationScore: 0,
          engagementLevel: 'Unknown' as const,
          problemFrequency: 'Unknown' as const,
          customerType: 'Unknown' as const,
          paymentWillingness: 'Unknown' as const,
          competitiveAnalysis: 'Unknown' as const,
          validationTier: 'Unknown' as const,
        },
      } : undefined,
      reasons: analysis.analysis.reasons,
    } : undefined;

    return {
      id: analysis.id,
      postId: analysis.postId,
      success: analysis.success,
      analysis: transformedAnalysis,
      error: analysis.error,
    };
  });
}

/**
 * Fallback: Process a single post individually
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _processIndividualPost(request: BatchAnalysisRequest): Promise<BatchAnalysisResult> {
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
    model: google('gemini-2.5-pro'),
    schema: opportunitySchema,
    prompt,
    temperature: 0.3,
  });

  // Transform the analysis to match AIAnalysisResponse format
  const transformedAnalysis = {
    isOpportunity: result.object.isOpportunity,
    confidence: result.object.confidence,
    opportunity: result.object.opportunity ? {
      ...result.object.opportunity,
      overallScore: calculateOverallScore(result.object.opportunity.delta4Scores),
      viabilityThreshold: calculateOverallScore(result.object.opportunity.delta4Scores) >= 4.0,
    } : undefined,
    reasons: result.object.reasons,
  };

  return {
    id: request.id,
    postId: request.postId,
    success: true,
    analysis: transformedAnalysis
  };
}

/**
 * Convert batch results to individual opportunity analyses
 */
export function processBatchResults(results: BatchAnalysisResult[]): Array<{
  postId: string;
  success: boolean;
  analysis?: AIAnalysisResponse;
  error?: string;
}> {
  return results.map(result => ({
    postId: result.postId,
    success: result.success,
    analysis: result.analysis,
    error: result.error
  }));
}

/**
 * Process a single batch of posts with cost tracking
 */
async function processBatchWithCostTracking(
  batch: BatchAnalysisRequest[],
  ai: AIWithCostTracking
): Promise<{
  results: BatchAnalysisResult[];
  cost: { inputCost: number; outputCost: number; totalCost: number };
}> {
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

**Delta 4 Theory:** A business needs 4+ improvement delta across: Speed, Convenience, Trust, Price, Status, Predictability, UI/UX, Ease of Use, Legal Friction, Emotional Comfort (scored 0-10).

**Example Analysis:**
- Reddit Post: "I spend hours manually scheduling social media posts for my clients. It's repetitive and I often forget to post at optimal times."
- Opportunity: AI-powered social media scheduling with optimal timing
- Delta 4 Scores: Speed: 8, Convenience: 9, Trust: 6, Price: 7, Status: 5, Predictability: 8, UI/UX: 7, Ease of Use: 8, Legal Friction: 9, Emotional Comfort: 7
- Average: 7.4/10 → Viable opportunity

**Anti-Patterns (Not Viable):**
- Vague complaints without specific problems
- Problems too trivial for AI solutions
- Policy/regulatory issues without business angle

**Task:** Analyze ${batch.length} Reddit posts for AI business opportunities.

**CRITICAL:** Return exactly ${batch.length} analyses in the same order as input posts.

**Posts to Analyze:**

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

**Analysis Requirements:**
For each post, provide:
1. **Problem Identification:** Core issue mentioned in the post
2. **AI Solution:** Specific AI-driven solution proposal
3. **Delta 4 Analysis:** Score each dimension (0-10) with brief reasoning
4. **Business Viability:** Market size, complexity, success probability
5. **Categorization:** Business type, revenue model, platform, industry, niche, target audience, capital requirements
6. **Overall Assessment:** Average Delta 4 score and viability conclusion

**Quality Standards:**
- Focus on clear, specific problems with customer pain
- Ensure AI provides substantial (4+) improvement
- Reference specific content from the Reddit post
- Use business logic for all categorizations
- Maintain consistent analysis depth across all posts

Return analyses in the exact same order as the input posts.
`;

  const { result, cost } = await ai.generateObjectWithTracking({
    model: 'gemini-2.5-flash',
    schema: batchAnalysisSchema,
    prompt,
    temperature: 0.3,
    operation: 'batch',
    batchSize: batch.length,
    batchMode: true,
  });

  const results = result.object.analyses.map(analysis => {
    // Transform the analysis to match AIAnalysisResponse format
    const transformedAnalysis = analysis.analysis ? {
      isOpportunity: analysis.analysis.isOpportunity,
      confidence: analysis.analysis.confidence,
      opportunity: analysis.analysis.opportunity ? {
        ...analysis.analysis.opportunity,
        // Calculate overall score from delta4Scores
        overallScore: calculateOverallScore(analysis.analysis.opportunity.delta4Scores),
        // Set viability threshold based on overall score
        viabilityThreshold: calculateOverallScore(analysis.analysis.opportunity.delta4Scores) >= 4.0,
        // Ensure marketValidation is present with defaults if missing
        marketValidation: analysis.analysis.opportunity.marketValidation || {
          marketValidationScore: 0,
          engagementLevel: 'Unknown' as const,
          problemFrequency: 'Unknown' as const,
          customerType: 'Unknown' as const,
          paymentWillingness: 'Unknown' as const,
          competitiveAnalysis: 'Unknown' as const,
          validationTier: 'Unknown' as const,
        },
      } : undefined,
      reasons: analysis.analysis.reasons,
    } : undefined;

    return {
      id: analysis.id,
      postId: analysis.postId,
      success: analysis.success,
      analysis: transformedAnalysis,
      error: analysis.error,
    };
  });

  return { results, cost };
}

/**
 * Process a single post individually with cost tracking
 */
async function processIndividualPostWithCostTracking(
  request: BatchAnalysisRequest,
  ai: AIWithCostTracking
): Promise<{
  result: BatchAnalysisResult;
  cost: { inputCost: number; outputCost: number; totalCost: number };
}> {
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

  const { result, cost } = await ai.generateObjectWithTracking({
    model: 'gemini-2.5-pro',
    schema: opportunitySchema,
    prompt,
    temperature: 0.3,
    operation: 'fallback',
  });

  // Transform the analysis to match AIAnalysisResponse format
  const transformedAnalysis = {
    isOpportunity: result.object.isOpportunity,
    confidence: result.object.confidence,
    opportunity: result.object.opportunity ? {
      ...result.object.opportunity,
      overallScore: calculateOverallScore(result.object.opportunity.delta4Scores),
      viabilityThreshold: calculateOverallScore(result.object.opportunity.delta4Scores) >= 4.0,
    } : undefined,
    reasons: result.object.reasons,
  };

  return {
    result: {
      id: request.id,
      postId: request.postId,
      success: true,
      analysis: transformedAnalysis
    },
    cost,
  };
}