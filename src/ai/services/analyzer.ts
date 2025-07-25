import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { analyzeSinglePostWithCostTracking } from './ai-with-cost-tracking';
import { AIAnalysisSessionData } from './cost-tracking';

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

export interface OpportunityCategories {
  businessType: string;
  businessModel: string;
  revenueModel: string;
  pricingModel: string;
  platform: string;
  mobileSupport: string;
  deploymentType: string;
  developmentType: string;
  targetAudience: string;
  userType: string;
  technicalLevel: string;
  ageGroup: string;
  geography: string;
  marketType: string;
  economicLevel: string;
  industryVertical: string;
  niche: string;
  developmentComplexity: string;
  teamSize: string;
  capitalRequirement: string;
  developmentTime: string;
  marketSizeCategory: string;
  competitionLevel: string;
  marketTrend: string;
  growthPotential: string;
  acquisitionStrategy: string;
  scalabilityType: string;
}

export interface MarketValidation {
  marketValidationScore: number;
  engagementLevel: 'Low' | 'Medium' | 'High' | 'Unknown';
  problemFrequency: 'Rare' | 'Occasional' | 'Frequent' | 'Very Frequent' | 'Unknown';
  customerType: 'Individual' | 'Business' | 'Both' | 'Unknown';
  paymentWillingness: 'Low' | 'Medium' | 'High' | 'Unknown';
  competitiveAnalysis: 'No Competition' | 'Low Competition' | 'Medium Competition' | 'High Competition' | 'Unknown';
  validationTier: 'Tier 1 (Build Now)' | 'Tier 2 (Validate Further)' | 'Tier 3 (Monitor)' | 'Unknown';
}

export interface MakeshiftSolution {
  description: string;
  currentApproach: string;
  painPoints: string[];
  timeInvestment: string;
  costEstimate: string;
  skillsRequired: string[];
  frustrationLevel: 'Low' | 'Medium' | 'High';
  scalabilityIssues: string[];
}

export interface SoftwareSolution {
  description: string;
  proposedApproach: string;
  keyFeatures: string[];
  automationLevel: 'Partial' | 'High' | 'Full';
  userExperience: string;
  integrationCapabilities: string[];
  maintenanceRequirements: string;
}

export interface DeltaComparison {
  makeshiftDelta4: Delta4Score;
  softwareDelta4: Delta4Score;
  improvementDelta: Delta4Score;
  totalDeltaScore: number;
  biggestImprovements: string[];
  reasonsForSoftware: string[];
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
  categories: OpportunityCategories;
  marketValidation: MarketValidation;
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
  makeshiftSolution?: MakeshiftSolution;
  softwareSolution?: SoftwareSolution;
  deltaComparison?: DeltaComparison;
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
const makeshiftSolutionSchema = z.object({
  description: z.string(),
  currentApproach: z.string(),
  painPoints: z.array(z.string()),
  timeInvestment: z.string(),
  costEstimate: z.string(),
  skillsRequired: z.array(z.string()),
  frustrationLevel: z.enum(['Low', 'Medium', 'High']),
  scalabilityIssues: z.array(z.string()),
});

const softwareSolutionSchema = z.object({
  description: z.string(),
  proposedApproach: z.string(),
  keyFeatures: z.array(z.string()),
  automationLevel: z.enum(['Partial', 'High', 'Full']),
  userExperience: z.string(),
  integrationCapabilities: z.array(z.string()),
  maintenanceRequirements: z.string(),
});

const deltaComparisonSchema = z.object({
  makeshiftDelta4: z.object({
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
  softwareDelta4: z.object({
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
  improvementDelta: z.object({
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
  totalDeltaScore: z.number(),
  biggestImprovements: z.array(z.string()),
  reasonsForSoftware: z.array(z.string()),
});

export const opportunitySchema = z.object({
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
    makeshiftSolution: makeshiftSolutionSchema.optional(),
    softwareSolution: softwareSolutionSchema.optional(),
    deltaComparison: deltaComparisonSchema.optional(),
  }).optional(),
  reasons: z.array(z.string()).optional(),
});

export class Delta4Analyzer {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeOpportunity(
    request: AIAnalysisRequest,
    options: {
      trackCosts?: boolean;
      redditPostId?: string;
      sessionData?: AIAnalysisSessionData;
    } = {}
  ): Promise<AIAnalysisResponse & { cost?: { inputCost: number; outputCost: number; totalCost: number } }> {
    console.log(`[AI] Starting structured analysis with Vercel AI SDK and Gemini`);
    
    const { trackCosts = false, redditPostId, sessionData } = options;
    
    try {
      if (trackCosts) {
        // Use cost tracking version
        const { analysis, cost } = await analyzeSinglePostWithCostTracking(
          request,
          opportunitySchema,
          this.buildPrompt(request),
          {
            model: 'gemini-2.5-pro',
            temperature: 0.3,
            redditPostId,
            sessionData,
          }
        );

        return {
          ...this.transformAnalysis(analysis as {
            isOpportunity: boolean;
            confidence: number;
            reasons?: string[];
            opportunity?: {
              title: string;
              description: string;
              currentSolution?: string;
              proposedSolution: string;
              marketContext?: string;
              implementationNotes?: string;
              delta4Scores: Delta4Score;
              marketSize: 'Small' | 'Medium' | 'Large' | 'Unknown';
              complexity: 'Low' | 'Medium' | 'High';
              successProbability: 'Low' | 'Medium' | 'High';
              categories: OpportunityCategories;
              marketValidation: MarketValidation;
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
              [key: string]: unknown;
            };
          }),
          cost,
        };
      } else {
        // Use original version without cost tracking
        const result = await generateObject({
          model: google('gemini-2.5-pro'),
          schema: opportunitySchema,
          prompt: this.buildPrompt(request),
          temperature: 0.3,
        });

        return this.transformAnalysis(result.object);
      }
    } catch (error) {
      console.error('Error in structured AI analysis:', error);
      throw error;
    }
  }

  private buildPrompt(request: AIAnalysisRequest): string {
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

**Reddit Post Analysis:**
- Title: ${request.postTitle}
- Content: ${request.postContent}
- Subreddit: r/${request.subreddit}
- Author: ${request.author}
- Score: ${request.score}
- Comments: ${request.numComments}

**Categorization Framework:**
You must categorize each opportunity across ALL dimensions. Use context clues, keywords, and business logic to determine the most likely category for each dimension:

${this.getSubredditSpecificPrompt(request.subreddit)}

**Example Analysis:**

**Reddit Post:** "I spend 3 hours every day manually creating product descriptions for my e-commerce store. It's tedious and I'm not even good at writing compelling copy. Any tools that can help?"

**Step-by-Step Analysis:**

1. **Problem Identification:** Manual product description writing is time-consuming (3 hours daily) and produces suboptimal results
2. **AI Solution:** AI-powered product description generator using NLP and e-commerce optimization
3. **Delta 4 Evaluation:**
   - Speed: 9 (3 hours → 30 minutes = 6x faster)
   - Convenience: 8 (automated vs manual writing)
   - Trust: 6 (AI-generated copy with human review)
   - Price: 7 (subscription vs hiring copywriter)
   - Status: 5 (professional-quality descriptions)
   - Predictability: 7 (consistent output quality)
   - UI/UX: 8 (simple input → polished output)
   - Ease of Use: 8 (minimal learning curve)
   - Legal Friction: 9 (no regulatory issues)
   - Emotional Comfort: 7 (reduces daily stress)

4. **Business Categorization:**
   - Business Type: AI-Powered
   - Revenue Model: SaaS
   - Platform: Web App
   - Industry: E-commerce
   - Niche: AI copywriting for product descriptions
   - Target Audience: Small Business
   - Capital Requirements: Low

5. **Market Validation Analysis:**
   - Engagement Level: High (247 comments, 89% upvoted)
   - Problem Frequency: Very Frequent (daily pain point)
   - Customer Type: Business (e-commerce store owners)
   - Payment Willingness: High (mentions current expensive copywriter)
   - Competitive Analysis: Medium Competition (some tools exist but not optimized)
   - Validation Tier: Tier 1 (Build Now) - High demand + clear willingness to pay

6. **Viability Assessment:** Average score 7.4/10 → Highly viable opportunity

**Task:**
Follow the same step-by-step approach for this Reddit post:

**Step 1:** Identify the core problem mentioned in the post
**Step 2:** Analyze the current makeshift solution (what users currently do)
**Step 3:** Design the ideal software solution (what a developer would build)
**Step 4:** Compare makeshift vs software using Delta 4 theory
**Step 5:** Evaluate the solution using Delta 4 theory (provide detailed reasoning for each dimension)
**Step 6:** Analyze market validation using the provided criteria
**Step 7:** Categorize the business opportunity across all dimensions
**Step 8:** Assess overall viability and provide comprehensive analysis

**IMPORTANT: Makeshift vs Software Analysis**
For every opportunity, analyze both the current makeshift solution and the ideal software solution:

**Makeshift Solution Analysis:**
- What do users currently do to solve this problem?
- What manual steps, workarounds, or hacks are they using?
- How much time does it take them daily/weekly?
- What skills do they need to learn?
- What are the pain points and frustrations?
- How does it scale (or not scale)?
- What does it cost them in time/money?

**Software Solution Analysis:**
- What would the ideal software solution look like?
- What key features would it have?
- How would it automate the current manual process?
- What would the user experience be?
- How would it integrate with existing tools?
- What level of automation would it provide?

**Delta Comparison:**
- Score the makeshift solution (0-10) on each Delta 4 dimension
- Score the software solution (0-10) on each Delta 4 dimension  
- Calculate the improvement delta (software - makeshift)
- Identify the biggest improvements software would provide
- Explain why software is worth building vs keeping makeshift solution

**Example Delta Comparison:**
Makeshift: Manual Excel tracking (Speed: 2, Convenience: 3, Trust: 6)
Software: Automated dashboard (Speed: 9, Convenience: 9, Trust: 8)
Improvement: +7 Speed, +6 Convenience, +2 Trust
Total Delta Score: 15 (sum of improvements)
Biggest Improvements: ["7x faster data processing", "6x easier to use", "2x more reliable"]

**Software/Tech Requirements:**
- Must be solvable with SOFTWARE (SaaS, web app, mobile app, API, platform)
- Must target DIGITAL customers (not physical services)
- Must be SCALABLE through code (not human-intensive)
- Must have RECURRING revenue potential
- Exclude: hardware, physical products, pure consulting, one-time services

**Market Validation Criteria:**
- Subreddit engagement level (comments, upvotes indicate demand)
- Frequency of similar posts (recurring problem = larger market)
- User type analysis (individual vs business customers)
- Willingness to pay indicators ("I'd pay for...", "expensive to...")
- Competitive landscape analysis (existing solutions mentioned)

**Requirements:**
- Only identify SOFTWARE/TECH problems with clear customer pain points
- Focus on opportunities where AI-powered SOFTWARE provides substantial (4+) improvement
- Must be buildable as a SaaS, web app, mobile app, or software tool
- Consider digital market size, implementation feasibility, and existing validation
- Provide specific reasoning that references the Reddit post content
- Use context clues and business logic for ALL categorizations
- Overall viability threshold is 4+ average Delta 4 score

If this is a viable opportunity, provide the complete analysis with full categorization. If not, explain why in the reasons array.
        `;
  }

  private transformAnalysis(analysis: {
    isOpportunity: boolean;
    confidence: number;
    reasons?: string[];
    opportunity?: {
      title: string;
      description: string;
      currentSolution?: string;
      proposedSolution: string;
      marketContext?: string;
      implementationNotes?: string;
      delta4Scores: Delta4Score;
      marketSize: 'Small' | 'Medium' | 'Large' | 'Unknown';
      complexity: 'Low' | 'Medium' | 'High';
      successProbability: 'Low' | 'Medium' | 'High';
      categories: OpportunityCategories;
      marketValidation: MarketValidation;
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
      makeshiftSolution?: MakeshiftSolution;
      softwareSolution?: SoftwareSolution;
      deltaComparison?: DeltaComparison;
      [key: string]: unknown;
    };
  }): AIAnalysisResponse {
    if (!analysis.isOpportunity || !analysis.opportunity) {
      return {
        isOpportunity: false,
        confidence: analysis.confidence,
        reasons: analysis.reasons || ['No significant opportunity identified'],
      };
    }

    const opportunity = analysis.opportunity;
    const overallScore = this.calculateOverallScore(opportunity.delta4Scores);

    return {
      isOpportunity: true,
      confidence: analysis.confidence,
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
        categories: opportunity.categories,
        marketValidation: opportunity.marketValidation,
        reasoning: opportunity.reasoning,
        makeshiftSolution: opportunity.makeshiftSolution,
        softwareSolution: opportunity.softwareSolution,
        deltaComparison: opportunity.deltaComparison,
      },
    };
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

  private calculateDeltaScore(makeshiftScores: Delta4Score, softwareScores: Delta4Score): number {
    const improvementDelta: Delta4Score = {
      speed: softwareScores.speed - makeshiftScores.speed,
      convenience: softwareScores.convenience - makeshiftScores.convenience,
      trust: softwareScores.trust - makeshiftScores.trust,
      price: softwareScores.price - makeshiftScores.price,
      status: softwareScores.status - makeshiftScores.status,
      predictability: softwareScores.predictability - makeshiftScores.predictability,
      uiUx: softwareScores.uiUx - makeshiftScores.uiUx,
      easeOfUse: softwareScores.easeOfUse - makeshiftScores.easeOfUse,
      legalFriction: softwareScores.legalFriction - makeshiftScores.legalFriction,
      emotionalComfort: softwareScores.emotionalComfort - makeshiftScores.emotionalComfort,
    };

    // Sum all positive improvements
    const totalImprovement = Object.values(improvementDelta)
      .filter(delta => delta > 0)
      .reduce((sum, delta) => sum + delta, 0);

    return Math.round(totalImprovement * 100) / 100;
  }

  private getSubredditSpecificPrompt(subreddit: string): string {
    const subredditPrompts: Record<string, string> = {
      'PromptEngineering': `
**r/PromptEngineering Analysis:**
Look for these specific startup opportunity patterns:

1. **Pain Point Indicators:**
   - "How do I prompt ChatGPT to...?"
   - "Looking for a better way to..."
   - "Anyone found a prompt for X?"
   - "What's the best way to automate Y?"
   - "Prompt for [use case]?"

2. **Productization Opportunities:**
   - Repeated manual prompting tasks that could be automated
   - Complex prompt workflows that could be simplified
   - Industry-specific prompt needs that could be packaged
   - Prompt versioning/testing problems
   - Multi-LLM compatibility issues

3. **Common Categories:**
   - **Content Generation**: Blogs, emails, SEO content, scripts
   - **Code Prompting**: Regex, SQL, debugging, script generation
   - **Agents/Automation**: Reports, workflows, scheduled tasks
   - **Education**: Teaching prompts, quizzing, explanations
   - **Compliance/Legal**: Contracts, policies, documentation
   - **Enterprise Workflows**: SOPs, meeting notes, communication

4. **Evaluation Criteria:**
   - Can this be **productized** into a repeatable service?
   - Can we **solve it 4x better** than manual prompting?
   - Is this a **repeated use case** worth automating?
   - Are people **hacking around** limitations that we could fix?
      `,
      
      'startups': `
**r/startups Analysis:**
Look for these specific patterns:

1. **Pain Point Indicators:**
   - "How to validate..."
   - "Struggling with..."
   - "Need help with..."
   - "Looking for co-founder for..."
   - "Built X but having trouble with Y"

2. **Opportunity Types:**
   - Validation problems (market research, user feedback)
   - Operational inefficiencies (hiring, accounting, legal)
   - Growth bottlenecks (marketing, sales, customer acquisition)
   - Technical challenges (scaling, infrastructure, integrations)

3. **Common Categories:**
   - **B2B SaaS**: Tools for other startups/businesses
   - **Marketplaces**: Connecting buyers and sellers
   - **Productivity**: Workflow and efficiency tools
   - **Analytics**: Data and insights platforms
      `,
      
      'entrepreneur': `
**r/entrepreneur Analysis:**
Look for these specific patterns:

1. **Pain Point Indicators:**
   - "How do I start..."
   - "What's the best way to..."
   - "I'm having trouble with..."
   - "Looking for advice on..."
   - "Has anyone tried..."

2. **Opportunity Types:**
   - Business process automation
   - Market research and validation tools
   - Financial management and accounting
   - Customer relationship management
   - Legal and compliance automation

3. **Common Categories:**
   - **Service Business**: Professional services that can be systematized
   - **B2B Tools**: Software to help other entrepreneurs
   - **Educational**: Training and courses
   - **Marketplace**: Connecting service providers with customers
      `,
      
      'programming': `
**r/programming Analysis:**
Look for these specific patterns:

1. **Pain Point Indicators:**
   - "How to debug..."
   - "Best practices for..."
   - "Tool recommendations for..."
   - "Struggling with..."
   - "Anyone know a good way to..."

2. **Opportunity Types:**
   - Development workflow improvements
   - Code quality and testing tools
   - Documentation and knowledge sharing
   - Deployment and infrastructure automation
   - Learning and skill development

3. **Common Categories:**
   - **Developer Tools**: IDEs, debugging, profiling
   - **DevOps**: CI/CD, monitoring, deployment
   - **Education**: Learning platforms, tutorials
   - **Productivity**: Code generation, automation
      `,
      
      'webdev': `
**r/webdev Analysis:**
Look for these specific patterns:

1. **Pain Point Indicators:**
   - "How do I build..."
   - "Best framework for..."
   - "Performance issues with..."
   - "Client wants..."
   - "Struggling with responsive..."

2. **Opportunity Types:**
   - Website building and hosting solutions
   - Performance optimization tools
   - Client management systems
   - Design and UX tools
   - E-commerce and payment solutions

3. **Common Categories:**
   - **SaaS Platforms**: Website builders, CMS systems
   - **Developer Tools**: Frameworks, libraries, testing
   - **Client Services**: Agency tools, project management
   - **Performance**: Optimization, monitoring, analytics
      `,
      
      'smallbusiness': `
**r/smallbusiness Analysis:**
Look for these specific patterns:

1. **Pain Point Indicators:**
   - "How to manage..."
   - "Best software for..."
   - "Struggling with cash flow..."
   - "Need help with marketing..."
   - "Looking for affordable..."

2. **Opportunity Types:**
   - Financial management and accounting
   - Customer relationship management
   - Inventory and supply chain
   - Marketing and social media
   - HR and payroll systems

3. **Common Categories:**
   - **Business Tools**: Accounting, CRM, inventory
   - **Marketing**: Social media, email, advertising
   - **Operations**: POS systems, scheduling, logistics
   - **Financial**: Payments, lending, insurance
      `,
      
      'legaladvice': `
**r/legaladvice Analysis:**
Look for these specific patterns:

1. **Pain Point Indicators:**
   - "Do I need a lawyer for..."
   - "What are my rights..."
   - "How to file..."
   - "Is this legal..."
   - "Contract question..."

2. **Opportunity Types:**
   - Legal document automation
   - Self-service legal guidance
   - Lawyer matching and discovery
   - Compliance monitoring tools
   - Legal research platforms

3. **Common Categories:**
   - **LegalTech**: Document automation, e-discovery
   - **Compliance**: Regulatory monitoring, reporting
   - **Consumer Tools**: DIY legal forms, guidance
   - **B2B Legal**: Contract management, IP protection
      `,
      
      'healthcare': `
**r/healthcare Analysis:**
Look for these specific patterns:

1. **Pain Point Indicators:**
   - "How to improve patient..."
   - "EHR system issues..."
   - "Billing and coding..."
   - "Staff scheduling..."
   - "Compliance with..."

2. **Opportunity Types:**
   - Electronic health records optimization
   - Patient communication and engagement
   - Medical billing and coding
   - Healthcare analytics and reporting
   - Telemedicine and remote care

3. **Common Categories:**
   - **HealthTech**: EHR, telemedicine, diagnostics
   - **Operations**: Scheduling, billing, compliance
   - **Patient Care**: Communication, monitoring, engagement
   - **Analytics**: Population health, outcomes measurement
      `
    };

    return subredditPrompts[subreddit] || `
**General Analysis:**
Look for clear problem statements, user pain points, and opportunities where AI/automation could provide significant value. Focus on:

1. **Pain Point Indicators:**
   - "How do I..."
   - "Struggling with..."
   - "Need help with..."
   - "Looking for better way to..."
   - "Anyone know how to..."

2. **Opportunity Types:**
   - Process automation possibilities
   - Information management problems
   - Communication and collaboration issues
   - Decision-making bottlenecks
   - Repetitive task automation

3. **Evaluation Criteria:**
   - Clear user demand and engagement
   - Potential for 4x improvement over current solutions
   - Scalable and repeatable problem
   - Technology feasibility
    `;
  }
}