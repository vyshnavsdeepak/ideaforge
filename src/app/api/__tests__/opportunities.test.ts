import { GET } from '../opportunities/route';
import { prisma } from '../../../lib/prisma';
import { NextRequest } from 'next/server';

// Mock the prisma module for API tests
jest.mock('../../../lib/prisma', () => ({
  prisma: {
    opportunity: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  opportunity: {
    count: jest.MockedFunction<() => Promise<number>>;
    findMany: jest.MockedFunction<() => Promise<unknown[]>>;
  };
};

describe('/api/opportunities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/opportunities', () => {
    test('should return opportunities with default parameters', async () => {
      const mockOpportunities = [
        {
          id: 'opp1',
          title: 'Test Opportunity 1',
          description: 'Test description 1',
          proposedSolution: 'Test solution 1',
          businessType: 'AI-Powered',
          businessModel: 'B2B',
          platform: 'Web App',
          industryVertical: 'Healthcare',
          overallScore: 7.5,
          viabilityThreshold: true,
          createdAt: new Date(),
          redditPost: {
            title: 'Test Reddit Post',
            author: 'test_author',
            score: 100,
            numComments: 25,
            permalink: '/r/test/comments/123',
          },
        },
      ];

      mockPrisma.opportunity.count.mockResolvedValue(1);
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);

      const request = new NextRequest('http://localhost:3000/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toHaveLength(1);
      expect(data.opportunities[0].title).toBe('Test Opportunity 1');
      expect(data.pagination.totalCount).toBe(1);
      expect(data.pagination.hasMore).toBe(false);
    });

    test('should filter opportunities by search term', async () => {
      const mockOpportunities = [
        {
          id: 'opp1',
          title: 'AI-Powered Healthcare Solution',
          description: 'AI solution for healthcare',
          proposedSolution: 'Machine learning diagnosis',
          businessType: 'AI-Powered',
          industryVertical: 'Healthcare',
          overallScore: 8.0,
          viabilityThreshold: true,
          createdAt: new Date(),
          redditPost: {
            title: 'Healthcare AI Discussion',
            author: 'healthcare_expert',
            score: 150,
            numComments: 45,
            permalink: '/r/healthcare/comments/456',
          },
        },
      ];

      mockPrisma.opportunity.count.mockResolvedValue(1);
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);

      const request = new NextRequest(
        'http://localhost:3000/api/opportunities?search=healthcare'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toHaveLength(1);
      expect(data.filters.search).toBe('healthcare');
      
      // Verify the where clause includes search
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'healthcare', mode: 'insensitive' } },
              { description: { contains: 'healthcare', mode: 'insensitive' } },
              { proposedSolution: { contains: 'healthcare', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    test('should filter opportunities by subreddit', async () => {
      const mockOpportunities = [
        {
          id: 'opp1',
          title: 'Startup Opportunity',
          description: 'Great startup idea',
          proposedSolution: 'Build a startup',
          businessType: 'Non-AI',
          businessModel: 'B2C',
          overallScore: 6.5,
          viabilityThreshold: true,
          createdAt: new Date(),
          redditPost: {
            title: 'Startup Discussion',
            author: 'startup_founder',
            score: 200,
            numComments: 50,
            permalink: '/r/startups/comments/789',
          },
        },
      ];

      mockPrisma.opportunity.count.mockResolvedValue(1);
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);

      const request = new NextRequest(
        'http://localhost:3000/api/opportunities?subreddit=startups'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toHaveLength(1);
      expect(data.filters.subreddit).toBe('startups');
      
      // Verify the where clause includes subreddit filter
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subreddit: 'startups',
          }),
        })
      );
    });

    test('should filter opportunities by minimum score', async () => {
      const mockOpportunities = [
        {
          id: 'opp1',
          title: 'High Score Opportunity',
          description: 'High scoring opportunity',
          proposedSolution: 'Excellent solution',
          businessType: 'AI-Powered',
          overallScore: 8.5,
          viabilityThreshold: true,
          createdAt: new Date(),
          redditPost: {
            title: 'High Quality Post',
            author: 'quality_user',
            score: 300,
            numComments: 75,
            permalink: '/r/quality/comments/999',
          },
        },
      ];

      mockPrisma.opportunity.count.mockResolvedValue(1);
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);

      const request = new NextRequest(
        'http://localhost:3000/api/opportunities?minScore=7.0'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toHaveLength(1);
      expect(data.filters.minScore).toBe(7.0);
      
      // Verify the where clause includes score filter
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            overallScore: { gte: 7.0 },
          }),
        })
      );
    });

    test('should handle pagination correctly', async () => {
      const mockOpportunities = Array.from({ length: 10 }, (_, i) => ({
        id: `opp${i + 1}`,
        title: `Opportunity ${i + 1}`,
        description: `Description ${i + 1}`,
        proposedSolution: `Solution ${i + 1}`,
        businessType: 'AI-Powered',
        overallScore: 7.0,
        viabilityThreshold: true,
        createdAt: new Date(),
        redditPost: {
          title: `Reddit Post ${i + 1}`,
          author: 'test_author',
          score: 100,
          numComments: 25,
          permalink: `/r/test/comments/${i + 1}`,
        },
      }));

      mockPrisma.opportunity.count.mockResolvedValue(50); // Total 50 opportunities
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);

      const request = new NextRequest(
        'http://localhost:3000/api/opportunities?page=2&limit=10'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.opportunities).toHaveLength(10);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalCount).toBe(50);
      expect(data.pagination.totalPages).toBe(5);
      expect(data.pagination.hasMore).toBe(true);
      
      // Verify pagination parameters
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit = (2 - 1) * 10 = 10
          take: 10,
        })
      );
    });

    test('should handle sorting by score', async () => {
      const mockOpportunities = [
        {
          id: 'opp1',
          title: 'High Score Opportunity',
          description: 'High scoring opportunity',
          proposedSolution: 'Excellent solution',
          businessType: 'AI-Powered',
          overallScore: 9.0,
          viabilityThreshold: true,
          createdAt: new Date(),
          redditPost: {
            title: 'High Quality Post',
            author: 'quality_user',
            score: 300,
            numComments: 75,
            permalink: '/r/quality/comments/999',
          },
        },
      ];

      mockPrisma.opportunity.count.mockResolvedValue(1);
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);

      const request = new NextRequest(
        'http://localhost:3000/api/opportunities?sortBy=score&sortOrder=desc'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters.sortBy).toBe('score');
      expect(data.filters.sortOrder).toBe('desc');
      
      // Verify sorting parameters
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ overallScore: 'desc' }, { sourceCount: 'desc' }],
        })
      );
    });

    test('should handle invalid parameters gracefully', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/opportunities?page=invalid&limit=1000'
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch opportunities');
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.opportunity.count.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/opportunities');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch opportunities');
    });
  });
});