import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface Delta4Score {
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
}

export interface OpportunityAnalysis {
  title: string;
  description: string;
  currentSolution?: string;
  proposedSolution: string;
  marketContext?: string;
  implementationNotes?: string;
  delta4Scores: Delta4Score;
  overallScore: number;
  viabilityThreshold: boolean;
  marketSize: 'Small' | 'Medium' | 'Large' | 'Unknown';
  complexity: 'Low' | 'Medium' | 'High';
  successProbability: 'Low' | 'Medium' | 'High';
  reasoning: {
    speed: string;
    convenience: string;
    trust: string;
    price: string;
    status: string;
    predictability: string;
    uiUx: string;
    easeOfUse: string;
    legalFriction: string;
    emotionalComfort: string;
  };
}

export interface AIAnalysisRequest {
  postTitle: string;
  postContent: string;
  subreddit: string;
  author: string;
  score: number;
  numComments: number;
}

export interface AIAnalysisResponse {
  isOpportunity: boolean;
  confidence: number;
  opportunity?: OpportunityAnalysis;
  reasons?: string[];
}

// Define the structured output schema
const opportunitySchema = z.object({
  isOpportunity: z.boolean(),
  confidence: z.number().min(0).max(1),
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
    marketSize: z.enum(['Small', 'Medium', 'Large', 'Unknown']),
    complexity: z.enum(['Low', 'Medium', 'High']),
    successProbability: z.enum(['Low', 'Medium', 'High']),
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
});

export class Delta4Analyzer {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeOpportunity(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    console.log(`[AI] Starting structured analysis with Vercel AI SDK and Gemini`);
    
    try {
      const result = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: opportunitySchema,
        prompt: `
You are an expert business analyst specializing in AI opportunities and Kunal Shah's Delta 4 theory.

**Delta 4 Theory Overview:**
For a business to be successful, it must provide a 4+ improvement delta across key dimensions:
1. Speed (0-10): How much faster is the solution?
2. Convenience (0-10): How much easier to use?
3. Trust (0-10): How much more trustworthy?
4. Price (0-10): How much more affordable?
5. Status (0-10): How much more prestigious?
6. Predictability (0-10): How much more reliable?
7. UI/UX (0-10): How much better user experience?
8. Ease of Use (0-10): How much simpler to learn?
9. Legal Friction (0-10): How much less regulatory complexity?
10. Emotional Comfort (0-10): How much more peace of mind?

**Scoring Guidelines:**
- 0-2: Minimal improvement
- 3-4: Moderate improvement  
- 5-6: Significant improvement
- 7-8: Major improvement
- 9-10: Revolutionary improvement

**Reddit Post Analysis:**
- Title: ${request.postTitle}
- Content: ${request.postContent}
- Subreddit: r/${request.subreddit}
- Author: ${request.author}
- Score: ${request.score}
- Comments: ${request.numComments}

**Task:**
Analyze this Reddit post for potential AI business opportunities. Determine if this post describes a genuine problem that could be solved with AI, and if so, provide a complete Delta 4 analysis.

**Requirements:**
- Only identify real problems with clear customer pain
- Focus on opportunities where AI can provide substantial value
- Consider market size and implementation feasibility
- Prioritize problems with existing engagement/validation
- Provide detailed reasoning for each Delta 4 dimension
- Overall viability threshold is 4+ average score

If this is a viable opportunity, provide the complete analysis. If not, explain why in the reasons array.
        `,
        temperature: 0.3,
      });

      console.log(`[AI] Structured analysis completed successfully`);
      
      // Transform the structured result to our expected format
      if (!result.object.isOpportunity || !result.object.opportunity) {
        return {
          isOpportunity: false,
          confidence: result.object.confidence,
          reasons: result.object.reasons || ['No significant opportunity identified'],
        };
      }

      const opportunity = result.object.opportunity;
      const overallScore = this.calculateOverallScore(opportunity.delta4Scores);

      return {
        isOpportunity: true,
        confidence: result.object.confidence,
        opportunity: {
          title: opportunity.title,
          description: opportunity.description,
          currentSolution: opportunity.currentSolution,
          proposedSolution: opportunity.proposedSolution,
          marketContext: opportunity.marketContext,
          implementationNotes: opportunity.implementationNotes,
          delta4Scores: opportunity.delta4Scores,
          overallScore: overallScore,
          viabilityThreshold: overallScore >= 4,
          marketSize: opportunity.marketSize,
          complexity: opportunity.complexity,
          successProbability: opportunity.successProbability,
          reasoning: opportunity.reasoning,
        },
      };
    } catch (error) {
      console.error('Error in structured AI analysis:', error);
      throw error;
    }
  }

  private calculateOverallScore(scores: Delta4Score): number {
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
}