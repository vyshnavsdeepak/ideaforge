import { GET } from '../route';
import { prisma } from '@/shared';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

// Mock the prisma module
jest.mock('@/shared', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    opportunityBookmark: {
      findMany: jest.fn(),
    },
    bookmarkCollection: {
      findMany: jest.fn(),
    },
  },
}));

// Mock next-auth session
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.MockedFunction<() => Promise<unknown | null>>;
  };
  opportunityBookmark: {
    findMany: jest.MockedFunction<() => Promise<unknown[]>>;
  };
  bookmarkCollection: {
    findMany: jest.MockedFunction<() => Promise<unknown[]>>;
  };
};

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/bookmarks/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bookmarks/check', () => {
    test('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/check?opportunityId=opp123');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should return 400 if opportunityId is missing', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/check');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('opportunityId is required');
    });

    test('should return bookmark status for opportunity', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const mockBookmarks = [
        {
          id: 'bookmark1',
          userId: 'user123',
          opportunityId: 'opp123',
          collectionId: 'coll1',
          collection: {
            id: 'coll1',
            name: 'Favorites',
            color: '#3B82F6',
            icon: '⭐',
          },
          createdAt: new Date(),
          notes: 'Interesting opportunity',
          rating: 4,
          tags: ['ai', 'startup'],
        },
      ];

      const mockCollections = [
        {
          id: 'coll1',
          name: 'Favorites',
          color: '#3B82F6',
          icon: '⭐',
        },
        {
          id: 'coll2',
          name: 'AI Opportunities',
          color: '#10B981',
          icon: '🤖',
        },
      ];

      mockPrisma.opportunityBookmark.findMany.mockResolvedValue(mockBookmarks);
      mockPrisma.bookmarkCollection.findMany.mockResolvedValue(mockCollections);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/check?opportunityId=opp123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isBookmarked).toBe(true);
      expect(data.bookmarks).toHaveLength(1);
      expect(data.collections).toHaveLength(2);
      expect(mockPrisma.opportunityBookmark.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          opportunityId: 'opp123',
        },
        include: {
          collection: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      });
    });

    test('should return not bookmarked status for opportunity', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const mockCollections = [
        {
          id: 'coll1',
          name: 'Favorites',
          color: '#3B82F6',
          icon: '⭐',
        },
      ];

      mockPrisma.opportunityBookmark.findMany.mockResolvedValue([]);
      mockPrisma.bookmarkCollection.findMany.mockResolvedValue(mockCollections);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/check?opportunityId=opp456');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isBookmarked).toBe(false);
      expect(data.bookmarks).toHaveLength(0);
      expect(data.collections).toHaveLength(1);
    });

    test('should handle database errors gracefully', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      mockPrisma.opportunityBookmark.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/bookmarks/check?opportunityId=opp123');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to check bookmark status');
    });
  });
});