import { prisma } from '@/shared/services/prisma';
import { randomUUID } from 'crypto';

// Gemini API Pricing Configuration (as of 2025)
export const GEMINI_PRICING = {
  'gemini-2.5-pro': {
    // Up to 200K tokens
    inputCost: 1.25 / 1_000_000,   // $1.25 per million input tokens
    outputCost: 10.0 / 1_000_000,  // $10.00 per million output tokens
    // Above 200K tokens
    inputCostHigh: 2.50 / 1_000_000,  // $2.50 per million input tokens
    outputCostHigh: 15.0 / 1_000_000, // $15.00 per million output tokens
    tokenThreshold: 200_000,
  },
  'gemini-2.5-flash': {
    inputCost: 0.10 / 1_000_000,   // $0.10 per million input tokens
    outputCost: 0.40 / 1_000_000,  // $0.40 per million output tokens
  },
  'gemini-1.5-pro': {
    inputCost: 1.25 / 1_000_000,   // $1.25 per million input tokens
    outputCost: 5.00 / 1_000_000,  // $5.00 per million output tokens
    contextCacheCost: 0.3125 / 1_000_000, // $0.3125 per million tokens
  },
  'gemini-1.5-flash': {
    inputCost: 0.0,  // Free tier
    outputCost: 0.0, // Free tier
  },
} as const;

// Batch pricing discount
export const BATCH_DISCOUNT = 0.5; // 50% discount for batch mode

export interface AIUsageMetrics {
  requestId: string;
  model: string;
  operation: 'individual' | 'batch' | 'fallback';
  inputTokens: number;
  outputTokens: number;
  batchSize?: number;
  batchMode?: boolean;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  errorMessage?: string;
  httpStatusCode?: number;
  retryCount?: number;
}

export interface AIAnalysisSessionData {
  sessionId: string;
  sessionType: 'individual' | 'batch' | 'fallback';
  triggeredBy?: string;
  subreddit?: string;
  postsRequested: number;
}

export interface AIPostAnalysisData {
  redditPostId: string;
  postTitle: string;
  subreddit: string;
  analysisType: 'individual' | 'batch' | 'fallback';
  model: string;
  isOpportunity: boolean;
  opportunityId?: string;
  confidence?: number;
  overallScore?: number;
  processingTime?: number;
  retryCount?: number;
  success: boolean;
  errorMessage?: string;
}

export class AICostTracker {
  private sessionId?: string;
  private sessionData?: AIAnalysisSessionData;

  constructor(sessionData?: AIAnalysisSessionData) {
    this.sessionData = sessionData;
    this.sessionId = sessionData?.sessionId || randomUUID();
  }

  /**
   * Calculate cost for a given model and token usage
   */
  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    batchMode: boolean = false
  ): { inputCost: number; outputCost: number; totalCost: number } {
    const pricing = GEMINI_PRICING[model as keyof typeof GEMINI_PRICING];
    
    if (!pricing) {
      console.warn(`[AI_COST] Unknown model: ${model}. Using default pricing.`);
      return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    let inputCost = 0;
    let outputCost = 0;

    // Handle tiered pricing for gemini-2.5-pro
    if (model === 'gemini-2.5-pro' && 'tokenThreshold' in pricing) {
      if (inputTokens <= pricing.tokenThreshold) {
        inputCost = inputTokens * pricing.inputCost;
      } else {
        // Split calculation: first 200K at normal rate, rest at high rate
        inputCost = pricing.tokenThreshold * pricing.inputCost + 
                   (inputTokens - pricing.tokenThreshold) * pricing.inputCostHigh;
      }
      
      if (outputTokens <= pricing.tokenThreshold) {
        outputCost = outputTokens * pricing.outputCost;
      } else {
        outputCost = pricing.tokenThreshold * pricing.outputCost + 
                    (outputTokens - pricing.tokenThreshold) * pricing.outputCostHigh;
      }
    } else {
      // Standard pricing calculation
      inputCost = inputTokens * pricing.inputCost;
      outputCost = outputTokens * pricing.outputCost;
    }

    // Apply batch discount if applicable
    if (batchMode) {
      inputCost *= BATCH_DISCOUNT;
      outputCost *= BATCH_DISCOUNT;
    }

    const totalCost = inputCost + outputCost;

    return {
      inputCost: Math.round(inputCost * 1_000_000) / 1_000_000, // Round to 6 decimal places
      outputCost: Math.round(outputCost * 1_000_000) / 1_000_000,
      totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
    };
  }

  /**
   * Track a single AI API call
   */
  async trackUsage(metrics: AIUsageMetrics): Promise<void> {
    try {
      const costs = this.calculateCost(
        metrics.model,
        metrics.inputTokens,
        metrics.outputTokens,
        metrics.batchMode || false
      );

      const duration = metrics.endTime ? 
        metrics.endTime.getTime() - metrics.startTime.getTime() : null;

      await prisma.aIUsageLog.create({
        data: {
          sessionId: this.sessionId,
          requestId: metrics.requestId,
          model: metrics.model,
          operation: metrics.operation,
          startTime: metrics.startTime,
          endTime: metrics.endTime,
          duration,
          inputTokens: metrics.inputTokens,
          outputTokens: metrics.outputTokens,
          totalTokens: metrics.inputTokens + metrics.outputTokens,
          inputCost: costs.inputCost,
          outputCost: costs.outputCost,
          totalCost: costs.totalCost,
          batchSize: metrics.batchSize,
          batchMode: metrics.batchMode || false,
          success: metrics.success,
          errorMessage: metrics.errorMessage,
          httpStatusCode: metrics.httpStatusCode,
          promptTokens: metrics.inputTokens,
          completionTokens: metrics.outputTokens,
          cacheHits: 0, // TODO: Implement cache tracking
        },
      });

      console.log(`[AI_COST] Tracked usage: ${metrics.model} - $${costs.totalCost.toFixed(6)} (${metrics.inputTokens} input, ${metrics.outputTokens} output tokens)`);
    } catch (error) {
      console.error('[AI_COST] Failed to track usage:', error);
    }
  }

  /**
   * Track a post analysis
   */
  async trackPostAnalysis(data: AIPostAnalysisData): Promise<void> {
    try {
      // First, get the usage log for this analysis to calculate costs
      const usageLog = await prisma.aIUsageLog.findFirst({
        where: {
          sessionId: this.sessionId,
          model: data.model,
          success: data.success,
        },
        orderBy: { createdAt: 'desc' },
      });

      const costs = usageLog ? {
        totalCost: usageLog.totalCost,
        inputCost: usageLog.inputCost,
        outputCost: usageLog.outputCost,
        inputTokens: usageLog.inputTokens,
        outputTokens: usageLog.outputTokens,
        totalTokens: usageLog.totalTokens,
      } : {
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };

      await prisma.aIPostAnalysis.create({
        data: {
          redditPostId: data.redditPostId,
          postTitle: data.postTitle,
          subreddit: data.subreddit,
          sessionId: this.sessionId,
          analysisType: data.analysisType,
          model: data.model,
          totalCost: costs.totalCost,
          inputCost: costs.inputCost,
          outputCost: costs.outputCost,
          inputTokens: costs.inputTokens,
          outputTokens: costs.outputTokens,
          totalTokens: costs.totalTokens,
          isOpportunity: data.isOpportunity,
          opportunityId: data.opportunityId,
          confidence: data.confidence,
          overallScore: data.overallScore,
          processingTime: data.processingTime,
          retryCount: data.retryCount,
          success: data.success,
          errorMessage: data.errorMessage,
        },
      });

      console.log(`[AI_COST] Tracked post analysis: ${data.postTitle} - $${costs.totalCost.toFixed(6)}`);
    } catch (error) {
      console.error('[AI_COST] Failed to track post analysis:', error);
    }
  }

  /**
   * Initialize an analysis session
   */
  async startSession(sessionData: AIAnalysisSessionData): Promise<void> {
    try {
      this.sessionData = sessionData;
      this.sessionId = sessionData.sessionId;

      await prisma.aIAnalysisSession.create({
        data: {
          id: this.sessionId,
          sessionType: sessionData.sessionType,
          triggeredBy: sessionData.triggeredBy,
          subreddit: sessionData.subreddit,
          postsRequested: sessionData.postsRequested,
          startTime: new Date(),
        },
      });

      console.log(`[AI_COST] Started analysis session: ${this.sessionId}`);
    } catch (error) {
      console.error('[AI_COST] Failed to start session:', error);
    }
  }

  /**
   * Finalize an analysis session with results
   */
  async finishSession(results: {
    postsProcessed: number;
    opportunitiesFound: number;
    errorCount: number;
    endTime: Date;
  }): Promise<void> {
    if (!this.sessionId) {
      console.error('[AI_COST] No session to finish');
      return;
    }

    try {
      // Calculate aggregated metrics from usage logs
      const usageLogs = await prisma.aIUsageLog.findMany({
        where: { sessionId: this.sessionId },
      });

      const totalCost = usageLogs.reduce((sum, log) => sum + log.totalCost, 0);
      const averageCostPerPost = results.postsProcessed > 0 ? totalCost / results.postsProcessed : 0;
      const successRate = usageLogs.length > 0 ? 
        (usageLogs.filter(log => log.success).length / usageLogs.length) * 100 : 0;

      // Get session start time
      const session = await prisma.aIAnalysisSession.findUnique({
        where: { id: this.sessionId },
      });

      const totalDuration = session ? 
        results.endTime.getTime() - session.startTime.getTime() : null;
      const averageDuration = totalDuration && results.postsProcessed > 0 ? 
        totalDuration / results.postsProcessed : null;

      await prisma.aIAnalysisSession.update({
        where: { id: this.sessionId },
        data: {
          postsProcessed: results.postsProcessed,
          opportunitiesFound: results.opportunitiesFound,
          errorCount: results.errorCount,
          totalCost,
          averageCostPerPost,
          successRate,
          totalDuration,
          averageDuration,
          endTime: results.endTime,
        },
      });

      console.log(`[AI_COST] Finished session: ${this.sessionId} - $${totalCost.toFixed(6)} total cost`);
    } catch (error) {
      console.error('[AI_COST] Failed to finish session:', error);
    }
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
    if (!this.sessionId) return null;

    try {
      const session = await prisma.aIAnalysisSession.findUnique({
        where: { id: this.sessionId },
        include: {
          usageLogs: true,
          postAnalyses: true,
        },
      });

      if (!session) return null;

      const totalCost = session.usageLogs.reduce((sum, log) => sum + log.totalCost, 0);
      const successfulAnalyses = session.postAnalyses.filter(analysis => analysis.success).length;
      const successRate = session.postAnalyses.length > 0 ? 
        (successfulAnalyses / session.postAnalyses.length) * 100 : 0;

      return {
        totalCost,
        postsProcessed: session.postsProcessed,
        opportunitiesFound: session.opportunitiesFound,
        successRate,
      };
    } catch (error) {
      console.error('[AI_COST] Failed to get session metrics:', error);
      return null;
    }
  }
}

/**
 * Daily aggregation job - should be run daily to aggregate usage stats
 */
export async function aggregateDailyUsage(date: Date): Promise<void> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all usage logs for the day
    const usageLogs = await prisma.aIUsageLog.findMany({
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Get all post analyses for the day
    const postAnalyses = await prisma.aIPostAnalysis.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate aggregated metrics
    const totalRequests = usageLogs.length;
    const successfulRequests = usageLogs.filter(log => log.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const totalCost = usageLogs.reduce((sum, log) => sum + log.totalCost, 0);
    const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
    const totalInputTokens = usageLogs.reduce((sum, log) => sum + log.inputTokens, 0);
    const totalOutputTokens = usageLogs.reduce((sum, log) => sum + log.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const postsAnalyzed = postAnalyses.length;
    const opportunitiesFound = postAnalyses.filter(analysis => analysis.isOpportunity).length;
    const averageCostPerPost = postsAnalyzed > 0 ? totalCost / postsAnalyzed : 0;
    const costPerOpportunity = opportunitiesFound > 0 ? totalCost / opportunitiesFound : 0;
    const averageResponseTime = usageLogs.length > 0 ? 
      usageLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / usageLogs.length : null;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    // Calculate model usage breakdown
    const modelUsageMap = new Map<string, {
      requests: number;
      cost: number;
      inputTokens: number;
      outputTokens: number;
      successRate: number;
      successCount?: number;
    }>();
    usageLogs.forEach(log => {
      const existing = modelUsageMap.get(log.model) || {
        requests: 0,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        successRate: 0,
      };
      
      existing.requests += 1;
      existing.cost += log.totalCost;
      existing.inputTokens += log.inputTokens;
      existing.outputTokens += log.outputTokens;
      existing.successCount = (existing.successCount || 0) + (log.success ? 1 : 0);
      existing.successRate = (existing.successCount / existing.requests) * 100;
      
      modelUsageMap.set(log.model, existing);
    });

    const modelUsage = Object.fromEntries(modelUsageMap);

    // Upsert daily usage record
    await prisma.aIDailyUsage.upsert({
      where: { date: startOfDay },
      update: {
        totalRequests,
        successfulRequests,
        failedRequests,
        totalCost,
        averageCostPerRequest,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        postsAnalyzed,
        opportunitiesFound,
        averageCostPerPost,
        costPerOpportunity,
        averageResponseTime,
        successRate,
        modelUsage,
      },
      create: {
        date: startOfDay,
        totalRequests,
        successfulRequests,
        failedRequests,
        totalCost,
        averageCostPerRequest,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        postsAnalyzed,
        opportunitiesFound,
        averageCostPerPost,
        costPerOpportunity,
        averageResponseTime,
        successRate,
        modelUsage,
      },
    });

    // Aggregate model-specific usage
    for (const [model, usage] of modelUsageMap) {
      const modelLogs = usageLogs.filter(log => log.model === model);
      const successCount = modelLogs.filter(log => log.success).length;
      const failureCount = modelLogs.length - successCount;
      const avgResponseTime = modelLogs.length > 0 ? 
        modelLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / modelLogs.length : null;
      const individualRequests = modelLogs.filter(log => log.operation === 'individual').length;
      const batchRequests = modelLogs.filter(log => log.operation === 'batch').length;
      const fallbackRequests = modelLogs.filter(log => log.operation === 'fallback').length;

      await prisma.aIModelUsage.upsert({
        where: { model_date: { model, date: startOfDay } },
        update: {
          requestCount: modelLogs.length,
          successCount,
          failureCount,
          totalCost: usage.cost,
          averageCostPerRequest: usage.cost / modelLogs.length,
          totalInputTokens: usage.inputTokens,
          totalOutputTokens: usage.outputTokens,
          totalTokens: usage.inputTokens + usage.outputTokens,
          averageResponseTime: avgResponseTime,
          successRate: usage.successRate,
          individualRequests,
          batchRequests,
          fallbackRequests,
        },
        create: {
          model,
          date: startOfDay,
          requestCount: modelLogs.length,
          successCount,
          failureCount,
          totalCost: usage.cost,
          averageCostPerRequest: usage.cost / modelLogs.length,
          totalInputTokens: usage.inputTokens,
          totalOutputTokens: usage.outputTokens,
          totalTokens: usage.inputTokens + usage.outputTokens,
          averageResponseTime: avgResponseTime,
          successRate: usage.successRate,
          individualRequests,
          batchRequests,
          fallbackRequests,
        },
      });
    }

    console.log(`[AI_COST] Daily aggregation completed for ${date.toISOString().split('T')[0]}: $${totalCost.toFixed(6)}`);
  } catch (error) {
    console.error('[AI_COST] Failed to aggregate daily usage:', error);
  }
}

/**
 * Utility function to get cost estimates for different operations
 */
export function getCostEstimate(
  model: string,
  inputTokens: number,
  outputTokens: number,
  batchMode: boolean = false
): { inputCost: number; outputCost: number; totalCost: number } {
  const tracker = new AICostTracker();
  return tracker.calculateCost(model, inputTokens, outputTokens, batchMode);
}

/**
 * Check if daily cost threshold is exceeded
 */
export async function checkCostThresholds(date: Date): Promise<{
  exceeded: boolean;
  dailyCost: number;
  threshold?: number;
  alert?: {
    id: string;
    threshold: number;
    alertType: string;
    description: string;
  };
}> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const dailyUsage = await prisma.aIDailyUsage.findUnique({
      where: { date: startOfDay },
    });

    if (!dailyUsage) {
      return { exceeded: false, dailyCost: 0 };
    }

    const activeAlerts = await prisma.aICostAlert.findMany({
      where: {
        isActive: true,
        alertType: 'daily',
      },
    });

    for (const alert of activeAlerts) {
      if (dailyUsage.totalCost >= alert.threshold) {
        // Update alert trigger count
        await prisma.aICostAlert.update({
          where: { id: alert.id },
          data: {
            lastTriggered: new Date(),
            triggerCount: { increment: 1 },
          },
        });

        return {
          exceeded: true,
          dailyCost: dailyUsage.totalCost,
          threshold: alert.threshold,
          alert,
        };
      }
    }

    return { exceeded: false, dailyCost: dailyUsage.totalCost };
  } catch (error) {
    console.error('[AI_COST] Failed to check cost thresholds:', error);
    return { exceeded: false, dailyCost: 0 };
  }
}