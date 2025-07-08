import OpenAI from 'openai';

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

export class Delta4Analyzer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async analyzeOpportunity(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const prompt = this.buildAnalysisPrompt(request);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }
      
      return this.parseAIResponse(content);
    } catch (error) {
      console.error('Error analyzing opportunity:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    return `
Analyze this Reddit post for potential AI business opportunities using Kunal Shah's Delta 4 theory:

**Post Details:**
- Title: ${request.postTitle}
- Content: ${request.postContent}
- Subreddit: r/${request.subreddit}
- Author: ${request.author}
- Score: ${request.score}
- Comments: ${request.numComments}

**Task:**
1. Determine if this post describes a genuine problem that could be solved with AI
2. If yes, analyze the opportunity using Delta 4 scoring (0-10 scale)
3. Provide detailed reasoning for each dimension
4. Calculate overall viability

**Focus on:**
- Real customer pain points
- Problems where AI can provide significant improvement
- Business opportunities with measurable impact
- Solutions that can achieve 4+ delta improvement

Please respond with a structured JSON analysis.
    `.trim();
  }

  private getSystemPrompt(): string {
    return `
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

**Analysis Criteria:**
- Only identify real problems with clear customer pain
- Focus on opportunities where AI can provide substantial value
- Consider market size and implementation feasibility
- Prioritize problems with existing engagement/validation

**Response Format:**
Return a JSON object with:
- isOpportunity: boolean
- confidence: number (0-1)
- opportunity: OpportunityAnalysis object (if applicable)
- reasons: string[] (if not an opportunity)

Be thorough but concise. Focus on actionable insights.
    `.trim();
  }

  private parseAIResponse(content: string): AIAnalysisResponse {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.isOpportunity) {
        return {
          isOpportunity: false,
          confidence: parsed.confidence || 0,
          reasons: parsed.reasons || ['No significant opportunity identified'],
        };
      }

      const opportunity: OpportunityAnalysis = {
        title: parsed.opportunity.title,
        description: parsed.opportunity.description,
        currentSolution: parsed.opportunity.currentSolution,
        proposedSolution: parsed.opportunity.proposedSolution,
        marketContext: parsed.opportunity.marketContext,
        implementationNotes: parsed.opportunity.implementationNotes,
        delta4Scores: parsed.opportunity.delta4Scores,
        overallScore: this.calculateOverallScore(parsed.opportunity.delta4Scores),
        viabilityThreshold: this.calculateOverallScore(parsed.opportunity.delta4Scores) >= 4,
        marketSize: parsed.opportunity.marketSize || 'Unknown',
        complexity: parsed.opportunity.complexity || 'Medium',
        successProbability: parsed.opportunity.successProbability || 'Medium',
        reasoning: parsed.opportunity.reasoning,
      };

      return {
        isOpportunity: true,
        confidence: parsed.confidence || 0,
        opportunity,
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI analysis response');
    }
  }

  private calculateOverallScore(scores: any): number {
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
      weightedSum += (scores[key] || 0) * weight;
    });

    return Math.round(weightedSum * 100) / 100;
  }
}