import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { AICostTracker, AIUsageMetrics, AIAnalysisSessionData, AIPostAnalysisData } from './ai-cost-tracking';

/**
 * AI API wrapper with automatic cost tracking
 */
export class AIWithCostTracking {
  private costTracker: AICostTracker;
  private sessionId: string;

  constructor(sessionData?: AIAnalysisSessionData) {
    this.sessionId = sessionData?.sessionId || randomUUID();
    this.costTracker = new AICostTracker(sessionData);
  }

  /**
   * Generate object with automatic cost tracking
   */
  async generateObjectWithTracking<T>({
    model,
    schema,
    prompt,
    temperature = 0.3,
    operation = 'individual',
    batchSize,
    batchMode = false,
    retryCount = 0,
  }: {
    model: string;
    schema: z.ZodSchema<T>;
    prompt: string;
    temperature?: number;
    operation?: 'individual' | 'batch' | 'fallback';
    batchSize?: number;
    batchMode?: boolean;
    retryCount?: number;
  }): Promise<{
    result: { object: T };
    usage: AIUsageMetrics;
    cost: { inputCost: number; outputCost: number; totalCost: number };
  }> {
    const requestId = randomUUID();
    const startTime = new Date();
    
    let result: { object: T };
    let usage: AIUsageMetrics;
    let cost: { inputCost: number; outputCost: number; totalCost: number };

    try {
      console.log(`[AI_TRACKED] Starting ${operation} analysis with ${model}`);
      
      // Make the AI API call
      result = await generateObject({
        model: google(model),
        schema,
        prompt,
        temperature,
      });

      const endTime = new Date();
      
      // TODO: Extract actual token usage from the response
      // For now, we'll estimate based on prompt/completion length
      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = this.estimateTokens(JSON.stringify(result.object));

      // Calculate cost
      cost = this.costTracker.calculateCost(model, inputTokens, outputTokens, batchMode);

      // Create usage metrics
      usage = {
        requestId,
        model,
        operation,
        inputTokens,
        outputTokens,
        batchSize,
        batchMode,
        startTime,
        endTime,
        success: true,
        retryCount,
      };

      // Track the usage
      await this.costTracker.trackUsage(usage);

      console.log(`[AI_TRACKED] ${operation} analysis completed: $${cost.totalCost.toFixed(6)} (${inputTokens} input, ${outputTokens} output tokens)`);

      return { result, usage, cost };
    } catch (error) {
      const endTime = new Date();
      
      // Estimate tokens even for failed requests
      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = 0; // No output on error
      
      cost = this.costTracker.calculateCost(model, inputTokens, outputTokens, batchMode);

      usage = {
        requestId,
        model,
        operation,
        inputTokens,
        outputTokens,
        batchSize,
        batchMode,
        startTime,
        endTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        httpStatusCode: this.extractHttpStatus(error),
        retryCount,
      };

      // Track the failed usage
      await this.costTracker.trackUsage(usage);

      console.error(`[AI_TRACKED] ${operation} analysis failed: ${error}`);
      console.log(`[AI_TRACKED] Failed request cost: $${cost.totalCost.toFixed(6)}`);

      throw error;
    }
  }

  /**
   * Track a post analysis result
   */
  async trackPostAnalysis(data: AIPostAnalysisData): Promise<void> {
    return this.costTracker.trackPostAnalysis(data);
  }

  /**
   * Start a new analysis session
   */
  async startSession(sessionData: AIAnalysisSessionData): Promise<void> {
    return this.costTracker.startSession(sessionData);
  }

  /**
   * Finish the current analysis session
   */
  async finishSession(results: {
    postsProcessed: number;
    opportunitiesFound: number;
    errorCount: number;
    endTime: Date;
  }): Promise<void> {
    return this.costTracker.finishSession(results);
  }

  /**
   * Get current session metrics
   */
  async getSessionMetrics(): Promise<{
    totalCost: number;
    postsProcessed: number;
    opportunitiesFound: number;
    successRate: number;
  } | null> {
    return this.costTracker.getSessionMetrics();
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Estimate token count from text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplified approach - in production, you'd want to use tiktoken or similar
    return Math.ceil(text.length / 4);
  }

  /**
   * Extract HTTP status code from error
   */
  private extractHttpStatus(error: unknown): number | undefined {
    if (error && typeof error === 'object' && 'response' in error) {
      const errorWithResponse = error as { response: { status: number } };
      if (errorWithResponse.response?.status) {
        return errorWithResponse.response.status;
      }
    }
    if (error && typeof error === 'object' && 'status' in error) {
      const errorWithStatus = error as { status: number };
      if (errorWithStatus.status) {
        return errorWithStatus.status;
      }
    }
    if (error && typeof error === 'object' && 'code' in error) {
      const errorWithCode = error as { code: string };
      if (errorWithCode.code) {
        // Map common error codes to HTTP status
        switch (errorWithCode.code) {
        case 'ENOTFOUND':
        case 'ECONNREFUSED':
          return 503;
        case 'ETIMEDOUT':
          return 504;
        default:
          return 500;
        }
      }
    }
    return undefined;
  }
}

/**
 * Factory function to create AI instance with cost tracking
 */
export function createAIWithCostTracking(sessionData?: AIAnalysisSessionData): AIWithCostTracking {
  return new AIWithCostTracking(sessionData);
}

/**
 * Utility function to wrap existing Delta4Analyzer with cost tracking
 */
export async function analyzeSinglePostWithCostTracking(
  request: {
    postTitle: string;
    postContent: string;
    subreddit: string;
    author: string;
    score: number;
    numComments: number;
  },
  schema: z.ZodSchema<unknown>,
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    redditPostId?: string;
    sessionData?: AIAnalysisSessionData;
    retryCount?: number;
  } = {}
): Promise<{
  analysis: unknown;
  usage: AIUsageMetrics;
  cost: { inputCost: number; outputCost: number; totalCost: number };
}> {
  const {
    model = 'gemini-2.5-pro',
    temperature = 0.3,
    redditPostId,
    sessionData,
    retryCount = 0,
  } = options;

  const ai = new AIWithCostTracking(sessionData);
  const processingStartTime = new Date();

  try {
    const { result, usage, cost } = await ai.generateObjectWithTracking({
      model,
      schema,
      prompt,
      temperature,
      operation: 'individual',
      retryCount,
    });

    const processingEndTime = new Date();
    const processingTime = processingEndTime.getTime() - processingStartTime.getTime();

    // Track post analysis if redditPostId is provided
    if (redditPostId) {
      await ai.trackPostAnalysis({
        redditPostId,
        postTitle: request.postTitle,
        subreddit: request.subreddit,
        analysisType: 'individual',
        model,
        isOpportunity: (result.object as { isOpportunity?: boolean }).isOpportunity || false,
        opportunityId: undefined, // Will be set later when opportunity is created
        confidence: (result.object as { confidence?: number }).confidence || undefined,
        overallScore: (result.object as { opportunity?: { overallScore?: number } }).opportunity?.overallScore || undefined,
        processingTime,
        retryCount,
        success: true,
      });
    }

    return {
      analysis: result.object,
      usage,
      cost,
    };
  } catch (error) {
    const processingEndTime = new Date();
    const processingTime = processingEndTime.getTime() - processingStartTime.getTime();

    // Track failed post analysis if redditPostId is provided
    if (redditPostId) {
      await ai.trackPostAnalysis({
        redditPostId,
        postTitle: request.postTitle,
        subreddit: request.subreddit,
        analysisType: 'individual',
        model,
        isOpportunity: false,
        processingTime,
        retryCount,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    throw error;
  }
}

/**
 * Utility function for batch analysis with cost tracking
 */
export async function analyzeBatchWithCostTracking(
  requests: Array<{
    id: string;
    postId: string;
    postTitle: string;
    postContent: string;
    subreddit: string;
    author: string;
    score: number;
    numComments: number;
  }>,
  schema: z.ZodSchema<unknown>,
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxBatchSize?: number;
    sessionData?: AIAnalysisSessionData;
  } = {}
): Promise<{
  results: Array<{
    id: string;
    postId: string;
    success: boolean;
    analysis?: unknown;
    error?: string;
  }>;
  totalUsage: AIUsageMetrics[];
  totalCost: { inputCost: number; outputCost: number; totalCost: number };
}> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.3,
    maxBatchSize = 10,
    sessionData,
  } = options;

  const ai = new AIWithCostTracking(sessionData);
  const allUsage: AIUsageMetrics[] = [];
  const allResults: Array<{
    id: string;
    postId: string;
    success: boolean;
    analysis?: unknown;
    error?: string;
  }> = [];

  // Process in batches
  for (let i = 0; i < requests.length; i += maxBatchSize) {
    const batch = requests.slice(i, i + maxBatchSize);
    const batchNumber = Math.floor(i / maxBatchSize) + 1;
    const totalBatches = Math.ceil(requests.length / maxBatchSize);

    console.log(`[AI_TRACKED] Processing batch ${batchNumber}/${totalBatches} with ${batch.length} posts`);

    try {
      const batchPrompt = `${prompt}

**Posts to Analyze:**

${batch.map((post, index) => `
POST ${index + 1}:
ID: ${post.id}
Post ID: ${post.postId}
Title: ${post.postTitle}
Content: ${post.postContent}
Subreddit: r/${post.subreddit}
Author: ${post.author}
Score: ${post.score}
Comments: ${post.numComments}
---
`).join('\n')}`;

      const { result, usage } = await ai.generateObjectWithTracking({
        model,
        schema,
        prompt: batchPrompt,
        temperature,
        operation: 'batch',
        batchSize: batch.length,
        batchMode: true,
      });

      allUsage.push(usage);

      // Process batch results
      type BatchAnalysisResult = {
        success: boolean;
        analysis?: {
          isOpportunity?: boolean;
          confidence?: number;
          opportunity?: {
            overallScore?: number;
          };
        };
        error?: string;
      };
      
      const batchResults = (result.object as { analyses?: BatchAnalysisResult[] }).analyses || [];
      for (let j = 0; j < batch.length; j++) {
        const request = batch[j];
        const analysis = batchResults[j];

        if (analysis && analysis.success) {
          allResults.push({
            id: request.id,
            postId: request.postId,
            success: true,
            analysis: analysis.analysis,
          });

          // Track individual post analysis
          await ai.trackPostAnalysis({
            redditPostId: request.postId,
            postTitle: request.postTitle,
            subreddit: request.subreddit,
            analysisType: 'batch',
            model,
            isOpportunity: analysis.analysis?.isOpportunity || false,
            confidence: analysis.analysis?.confidence || undefined,
            overallScore: analysis.analysis?.opportunity?.overallScore || undefined,
            processingTime: usage.endTime && usage.startTime ? 
              usage.endTime.getTime() - usage.startTime.getTime() : undefined,
            retryCount: 0,
            success: true,
          });
        } else {
          allResults.push({
            id: request.id,
            postId: request.postId,
            success: false,
            error: analysis?.error || 'Unknown batch processing error',
          });

          // Track failed post analysis
          await ai.trackPostAnalysis({
            redditPostId: request.postId,
            postTitle: request.postTitle,
            subreddit: request.subreddit,
            analysisType: 'batch',
            model,
            isOpportunity: false,
            processingTime: usage.endTime && usage.startTime ? 
              usage.endTime.getTime() - usage.startTime.getTime() : undefined,
            retryCount: 0,
            success: false,
            errorMessage: analysis?.error || 'Unknown batch processing error',
          });
        }
      }
    } catch (error) {
      console.error(`[AI_TRACKED] Batch ${batchNumber} failed:`, error);
      
      // Add failed results for all posts in this batch
      for (const request of batch) {
        allResults.push({
          id: request.id,
          postId: request.postId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  // Calculate total cost
  const totalCost = allUsage.reduce((total, usage) => {
    const cost = ai['costTracker'].calculateCost(
      usage.model,
      usage.inputTokens,
      usage.outputTokens,
      usage.batchMode || false
    );
    return {
      inputCost: total.inputCost + cost.inputCost,
      outputCost: total.outputCost + cost.outputCost,
      totalCost: total.totalCost + cost.totalCost,
    };
  }, { inputCost: 0, outputCost: 0, totalCost: 0 });

  return {
    results: allResults,
    totalUsage: allUsage,
    totalCost,
  };
}

export default AIWithCostTracking;