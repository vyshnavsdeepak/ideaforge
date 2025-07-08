import { prisma } from '../prisma';

describe('Database Schema Integration Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('RedditPost Model', () => {
    test('should create a RedditPost with all required fields', async () => {
      const redditPost = await prisma.redditPost.create({
        data: {
          redditId: 'test_reddit_id',
          title: 'Test Reddit Post',
          content: 'Test content',
          subreddit: 'test',
          author: 'test_author',
          score: 100,
          upvotes: 110,
          downvotes: 10,
          numComments: 5,
          url: 'https://reddit.com/test',
          permalink: '/r/test/comments/123/test',
          createdUtc: new Date(),
        },
      });

      expect(redditPost.id).toBeDefined();
      expect(redditPost.redditId).toBe('test_reddit_id');
      expect(redditPost.title).toBe('Test Reddit Post');
      expect(redditPost.subreddit).toBe('test');
      expect(redditPost.author).toBe('test_author');
      expect(redditPost.score).toBe(100);
      expect(redditPost.createdAt).toBeDefined();
      expect(redditPost.updatedAt).toBeDefined();

      // Cleanup
      await prisma.redditPost.delete({
        where: { id: redditPost.id },
      });
    });

    test('should enforce unique constraint on redditId', async () => {
      const redditPost = await prisma.redditPost.create({
        data: {
          redditId: 'unique_reddit_id',
          title: 'First Post',
          subreddit: 'test',
          author: 'test_author',
          createdUtc: new Date(),
        },
      });

      await expect(
        prisma.redditPost.create({
          data: {
            redditId: 'unique_reddit_id', // Same redditId
            title: 'Second Post',
            subreddit: 'test',
            author: 'test_author',
            createdUtc: new Date(),
          },
        })
      ).rejects.toThrow();

      // Cleanup
      await prisma.redditPost.delete({
        where: { id: redditPost.id },
      });
    });
  });

  describe('Opportunity Model', () => {
    test('should create an Opportunity with all categorization fields', async () => {
      // First create a RedditPost
      const redditPost = await prisma.redditPost.create({
        data: {
          redditId: 'test_reddit_for_opp',
          title: 'Test Reddit Post for Opportunity',
          subreddit: 'test',
          author: 'test_author',
          createdUtc: new Date(),
        },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          title: 'Test AI Opportunity',
          description: 'A test opportunity for AI development',
          proposedSolution: 'Build an AI-powered solution',
          subreddit: 'test',
          redditPostId: redditPost.id,
          
          // Delta 4 scores
          speedScore: 7,
          convenienceScore: 8,
          trustScore: 6,
          priceScore: 9,
          statusScore: 5,
          predictabilityScore: 7,
          uiUxScore: 8,
          easeOfUseScore: 9,
          legalFrictionScore: 6,
          emotionalComfortScore: 7,
          
          overallScore: 7.2,
          viabilityThreshold: true,
          
          // Test all new categorization fields
          businessType: 'AI-Powered',
          businessModel: 'B2B',
          revenueModel: 'SaaS',
          pricingModel: 'Subscription',
          platform: 'Web App',
          mobileSupport: 'Cross-platform',
          deploymentType: 'Cloud',
          developmentType: 'Custom Development',
          targetAudience: 'Small Business',
          userType: 'Professionals',
          technicalLevel: 'Non-Technical',
          ageGroup: 'Millennials',
          geography: 'Global',
          marketType: 'Urban',
          economicLevel: 'Developed',
          industryVertical: 'Healthcare',
          developmentComplexity: 'Medium',
          teamSize: 'Small Team',
          capitalRequirement: 'Medium',
          developmentTime: 'Medium Development',
          marketSizeCategory: 'Mass Market',
          competitionLevel: 'Medium',
          marketTrend: 'Emerging',
          growthPotential: 'Exponential',
          acquisitionStrategy: 'Organic',
          scalabilityType: 'Scalable',
        },
      });

      // Verify all fields are stored correctly
      expect(opportunity.id).toBeDefined();
      expect(opportunity.title).toBe('Test AI Opportunity');
      expect(opportunity.businessType).toBe('AI-Powered');
      expect(opportunity.businessModel).toBe('B2B');
      expect(opportunity.revenueModel).toBe('SaaS');
      expect(opportunity.platform).toBe('Web App');
      expect(opportunity.industryVertical).toBe('Healthcare');
      expect(opportunity.developmentComplexity).toBe('Medium');
      expect(opportunity.targetAudience).toBe('Small Business');
      expect(opportunity.capitalRequirement).toBe('Medium');
      expect(opportunity.overallScore).toBe(7.2);
      expect(opportunity.viabilityThreshold).toBe(true);
      expect(opportunity.createdAt).toBeDefined();

      // Cleanup
      await prisma.opportunity.delete({
        where: { id: opportunity.id },
      });
      await prisma.redditPost.delete({
        where: { id: redditPost.id },
      });
    });

    test('should enforce unique constraint on redditPostId', async () => {
      const redditPost = await prisma.redditPost.create({
        data: {
          redditId: 'unique_reddit_for_opp',
          title: 'Test Reddit Post',
          subreddit: 'test',
          author: 'test_author',
          createdUtc: new Date(),
        },
      });

      const opportunity1 = await prisma.opportunity.create({
        data: {
          title: 'First Opportunity',
          description: 'First opportunity description',
          proposedSolution: 'First solution',
          subreddit: 'test',
          redditPostId: redditPost.id,
        },
      });

      // Should fail because redditPostId is already used
      await expect(
        prisma.opportunity.create({
          data: {
            title: 'Second Opportunity',
            description: 'Second opportunity description',
            proposedSolution: 'Second solution',
            subreddit: 'test',
            redditPostId: redditPost.id, // Same redditPostId
          },
        })
      ).rejects.toThrow();

      // Cleanup
      await prisma.opportunity.delete({
        where: { id: opportunity1.id },
      });
      await prisma.redditPost.delete({
        where: { id: redditPost.id },
      });
    });
  });

  describe('Database Indexes', () => {
    test('should efficiently query by subreddit', async () => {
      const redditPost = await prisma.redditPost.create({
        data: {
          redditId: 'test_index_reddit',
          title: 'Test Index Post',
          subreddit: 'startups',
          author: 'test_author',
          createdUtc: new Date(),
        },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          title: 'Test Index Opportunity',
          description: 'Test opportunity',
          proposedSolution: 'Test solution',
          subreddit: 'startups',
          redditPostId: redditPost.id,
        },
      });

      // Test querying by subreddit (should use index)
      const opportunities = await prisma.opportunity.findMany({
        where: { subreddit: 'startups' },
      });

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].id).toBe(opportunity.id);

      // Cleanup
      await prisma.opportunity.delete({
        where: { id: opportunity.id },
      });
      await prisma.redditPost.delete({
        where: { id: redditPost.id },
      });
    });

    test('should efficiently query by viabilityThreshold', async () => {
      const redditPost = await prisma.redditPost.create({
        data: {
          redditId: 'test_viable_reddit',
          title: 'Test Viable Post',
          subreddit: 'test',
          author: 'test_author',
          createdUtc: new Date(),
        },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          title: 'Test Viable Opportunity',
          description: 'Test opportunity',
          proposedSolution: 'Test solution',
          subreddit: 'test',
          viabilityThreshold: true,
          redditPostId: redditPost.id,
        },
      });

      // Test querying by viabilityThreshold (should use index)
      const viableOpportunities = await prisma.opportunity.findMany({
        where: { viabilityThreshold: true },
      });

      expect(viableOpportunities.length).toBeGreaterThan(0);
      expect(viableOpportunities.some(opp => opp.id === opportunity.id)).toBe(true);

      // Cleanup
      await prisma.opportunity.delete({
        where: { id: opportunity.id },
      });
      await prisma.redditPost.delete({
        where: { id: redditPost.id },
      });
    });
  });

  describe('Database Relationships', () => {
    test('should properly relate RedditPost and Opportunity', async () => {
      const redditPost = await prisma.redditPost.create({
        data: {
          redditId: 'test_relation_reddit',
          title: 'Test Relation Post',
          subreddit: 'test',
          author: 'test_author',
          createdUtc: new Date(),
        },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          title: 'Test Relation Opportunity',
          description: 'Test opportunity',
          proposedSolution: 'Test solution',
          subreddit: 'test',
          redditPostId: redditPost.id,
        },
      });

      // Test relationship from opportunity to redditPost
      const opportunityWithPost = await prisma.opportunity.findUnique({
        where: { id: opportunity.id },
        include: { redditPost: true },
      });

      expect(opportunityWithPost?.redditPost).toBeDefined();
      expect(opportunityWithPost?.redditPost.id).toBe(redditPost.id);
      expect(opportunityWithPost?.redditPost.title).toBe('Test Relation Post');

      // Test relationship from redditPost to opportunity
      const postWithOpportunity = await prisma.redditPost.findUnique({
        where: { id: redditPost.id },
        include: { opportunity: true },
      });

      expect(postWithOpportunity?.opportunity).toBeDefined();
      expect(postWithOpportunity?.opportunity?.id).toBe(opportunity.id);
      expect(postWithOpportunity?.opportunity?.title).toBe('Test Relation Opportunity');

      // Cleanup
      await prisma.opportunity.delete({
        where: { id: opportunity.id },
      });
      await prisma.redditPost.delete({
        where: { id: redditPost.id },
      });
    });
  });
});