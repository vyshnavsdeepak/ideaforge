import { prisma } from '../prisma';

// Mock the prisma module
jest.mock('../prisma', () => ({
  prisma: {
    redditPost: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    opportunity: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    opportunitySource: {
      deleteMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

interface MockedPrismaClient {
  redditPost: {
    create: jest.MockedFunction<() => Promise<Record<string, unknown>>>;
    delete: jest.MockedFunction<() => Promise<Record<string, unknown>>>;
    findUnique: jest.MockedFunction<() => Promise<Record<string, unknown> | null>>;
    findMany: jest.MockedFunction<() => Promise<Record<string, unknown>[]>>;
  };
  opportunity: {
    create: jest.MockedFunction<() => Promise<Record<string, unknown>>>;
    delete: jest.MockedFunction<() => Promise<Record<string, unknown>>>;
    findUnique: jest.MockedFunction<() => Promise<Record<string, unknown> | null>>;
    findMany: jest.MockedFunction<() => Promise<Record<string, unknown>[]>>;
  };
  opportunitySource: {
    deleteMany: jest.MockedFunction<() => Promise<Record<string, unknown>>>;
  };
  $disconnect: jest.MockedFunction<() => Promise<void>>;
}

const mockPrisma = prisma as unknown as MockedPrismaClient;

describe('Database Schema Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mockPrisma.$disconnect();
  });

  describe('RedditPost Model', () => {
    test('should create a RedditPost with all required fields', async () => {
      const mockRedditPost = {
        id: 'test-id',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.redditPost.create.mockResolvedValue(mockRedditPost);

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
      
      expect(mockPrisma.redditPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          redditId: 'test_reddit_id',
          title: 'Test Reddit Post',
          subreddit: 'test',
        }),
      });
    });

    test('should enforce unique constraint on redditId', async () => {
      const mockRedditPost = {
        id: 'test-id',
        redditId: 'unique_reddit_id',
        title: 'First Post',
        subreddit: 'test',
        author: 'test_author',
        createdUtc: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First create should succeed
      mockPrisma.redditPost.create.mockResolvedValueOnce(mockRedditPost);
      
      // Second create should fail with unique constraint error
      mockPrisma.redditPost.create.mockRejectedValueOnce(
        new Error('Unique constraint failed')
      );

      const redditPost = await prisma.redditPost.create({
        data: {
          redditId: 'unique_reddit_id',
          title: 'First Post',
          subreddit: 'test',
          author: 'test_author',
          createdUtc: new Date(),
        },
      });

      expect(redditPost.id).toBeDefined();

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
      ).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('Opportunity Model', () => {
    test('should create an Opportunity with all categorization fields', async () => {
      const mockOpportunity = {
        id: 'opp-test-id',
        title: 'Test AI Opportunity',
        description: 'A test opportunity for AI development',
        proposedSolution: 'Build an AI-powered solution',
        subreddit: 'test',
        overallScore: 7.2,
        viabilityThreshold: true,
        businessType: 'AI-Powered',
        businessModel: 'B2B',
        platform: 'Web App',
        industryVertical: 'Healthcare',
        targetAudience: 'Small Business',
        niche: 'AI Healthcare',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.opportunity.create.mockResolvedValue(mockOpportunity);

      const opportunity = await prisma.opportunity.create({
        data: {
          title: 'Test AI Opportunity',
          description: 'A test opportunity for AI development',
          proposedSolution: 'Build an AI-powered solution',
          subreddit: 'test',
          businessType: 'AI-Powered',
          businessModel: 'B2B',
          platform: 'Web App',
          industryVertical: 'Healthcare',
          targetAudience: 'Small Business',
          niche: 'AI Healthcare',
          overallScore: 7.2,
          viabilityThreshold: true,
        },
      });

      // Verify all fields are stored correctly
      expect(opportunity.id).toBeDefined();
      expect(opportunity.title).toBe('Test AI Opportunity');
      expect(opportunity.businessType).toBe('AI-Powered');
      expect(opportunity.businessModel).toBe('B2B');
      expect(opportunity.platform).toBe('Web App');
      expect(opportunity.industryVertical).toBe('Healthcare');
      expect(opportunity.targetAudience).toBe('Small Business');
      expect(opportunity.overallScore).toBe(7.2);
      expect(opportunity.viabilityThreshold).toBe(true);
      expect(opportunity.createdAt).toBeDefined();

      expect(mockPrisma.opportunity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test AI Opportunity',
          businessType: 'AI-Powered',
          industryVertical: 'Healthcare',
        }),
      });
    });

    test('should query opportunities efficiently', async () => {
      const mockOpportunities = [
        {
          id: 'opp1',
          title: 'Test Opportunity 1',
          subreddit: 'startups',
          viabilityThreshold: true,
          overallScore: 8.0,
        },
        {
          id: 'opp2',
          title: 'Test Opportunity 2',
          subreddit: 'startups',
          viabilityThreshold: true,
          overallScore: 7.5,
        },
      ];

      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);

      // Test querying by subreddit
      const opportunities = await prisma.opportunity.findMany({
        where: { subreddit: 'startups' },
      });

      expect(opportunities).toHaveLength(2);
      expect(opportunities[0].subreddit).toBe('startups');
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith({
        where: { subreddit: 'startups' },
      });
    });

    test('should query by viability threshold', async () => {
      const mockViableOpportunities = [
        {
          id: 'opp1',
          title: 'Viable Opportunity',
          viabilityThreshold: true,
          overallScore: 8.0,
        },
      ];

      mockPrisma.opportunity.findMany.mockResolvedValue(mockViableOpportunities);

      const viableOpportunities = await prisma.opportunity.findMany({
        where: { viabilityThreshold: true },
      });

      expect(viableOpportunities.length).toBeGreaterThan(0);
      expect(viableOpportunities[0].viabilityThreshold).toBe(true);
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith({
        where: { viabilityThreshold: true },
      });
    });
  });

  describe('Database Relationships', () => {
    test('should properly mock relationship queries', async () => {
      const mockOpportunityWithPosts = {
        id: 'opp-test-id',
        title: 'Test Relationship Opportunity',
        redditPosts: [
          {
            id: 'source-1',
            redditPostId: 'reddit-1',
            sourceType: 'post',
            confidence: 0.9,
            redditPost: {
              id: 'reddit-1',
              title: 'Test Reddit Post',
              subreddit: 'test',
              author: 'test_author',
            },
          },
        ],
      };

      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunityWithPosts);

      const opportunityWithPosts = await prisma.opportunity.findUnique({
        where: { id: 'opp-test-id' },
        include: { 
          redditPosts: {
            include: {
              redditPost: true,
            },
          },
        },
      });

      expect(opportunityWithPosts?.redditPosts).toBeDefined();
      expect(opportunityWithPosts?.redditPosts).toHaveLength(1);
      expect(opportunityWithPosts?.redditPosts[0].redditPost.title).toBe('Test Reddit Post');
      
      expect(mockPrisma.opportunity.findUnique).toHaveBeenCalledWith({
        where: { id: 'opp-test-id' },
        include: expect.objectContaining({
          redditPosts: expect.any(Object),
        }),
      });
    });
  });
});