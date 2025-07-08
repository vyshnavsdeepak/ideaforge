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

**Categorization Framework:**
You must categorize each opportunity across ALL dimensions. Use context clues, keywords, and business logic to determine the most likely category for each dimension:

**Business Type:** Determine AI involvement based on solution description:
- "AI-Powered": Core functionality relies on AI/ML (automation, predictions, NLP, computer vision)
- "AI-Adjacent": Could benefit from AI but doesn't require it
- "Non-AI": Traditional solution without AI components

**Business Model:** Analyze target customers and value proposition:
- "B2B": Businesses as primary customers
- "B2C": Individual consumers as primary customers  
- "B2B2C": Businesses selling to consumers

**Revenue Model:** Infer from solution type and market:
- "SaaS": Software subscription service
- "Marketplace": Platform connecting buyers/sellers
- "Service": Human-delivered service
- "Product": One-time purchase item

**Platform:** Determine optimal delivery method:
- "Web App": Browser-based application
- "Mobile App": iOS/Android native app
- "Desktop App": Desktop software
- "Hybrid": Multi-platform solution

**Industry Vertical:** Map to primary industry based on problem domain:
- Healthcare, Finance, Education, E-commerce, Marketing, Legal, Real Estate, Manufacturing, Entertainment, Gaming, Productivity, etc.

**Development Complexity:** Assess technical requirements:
- "Simple": Basic CRUD, simple UI, existing APIs
- "Medium": Custom algorithms, integrations, moderate UI
- "Complex": Advanced AI/ML, complex workflows, high scalability needs

**Target Audience:** Identify primary users:
- "Individual Consumers": General public
- "Small Business": <100 employees
- "Enterprise": Large corporations
- "Developers": Technical users

**Capital Requirements:** Estimate startup costs:
- "Low": <$50K (solo founder, simple tech)
- "Medium": $50K-$500K (small team, moderate tech)
- "High": >$500K (large team, complex tech, regulatory)

Use scoring-based logic: analyze keywords, context, and business patterns to make intelligent categorization decisions.

**Subreddit-Specific Analysis Patterns:**

${this.getSubredditSpecificPrompt(request.subreddit)}

**Task:**
Analyze this Reddit post for potential AI business opportunities. Determine if this post describes a genuine problem that could be solved with AI, and if so, provide a complete Delta 4 analysis AND comprehensive categorization.

**Requirements:**
- Only identify real problems with clear customer pain
- Focus on opportunities where AI can provide substantial value
- Consider market size and implementation feasibility
- Prioritize problems with existing engagement/validation
- Provide detailed reasoning for each Delta 4 dimension
- Use context clues and business logic for ALL categorizations
- Overall viability threshold is 4+ average score

If this is a viable opportunity, provide the complete analysis with full categorization. If not, explain why in the reasons array.
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
          categories: opportunity.categories,
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