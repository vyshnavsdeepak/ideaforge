import { GET, PUT, DELETE } from '../route';
import { prisma } from '@/shared/services/prisma';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ensureAdminUser } from '@/auth';

// Mock the prisma module
jest.mock('@/shared/services/prisma', () => ({
  prisma: {
    opportunityBookmark: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock next-auth session
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth domain
jest.mock('@/auth', () => ({
  authOptions: {},
  ensureAdminUser: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  opportunityBookmark: {
    findFirst: jest.MockedFunction<() => Promise<unknown | null>>;
    update: jest.MockedFunction<() => Promise<unknown>>;
    delete: jest.MockedFunction<() => Promise<unknown>>;
  };
};

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockEnsureAdminUser = ensureAdminUser as jest.MockedFunction<typeof ensureAdminUser>;

describe('/api/bookmarks/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ensureAdminUser to return a user by default
    mockEnsureAdminUser.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('GET /api/bookmarks/[id]', () => {
    test('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/test-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should return bookmark by ID', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockBookmark = {
        id: 'bookmark1',
        userId: 'user123',
        opportunityId: 'opp1',
        collectionId: 'coll1',
        notes: 'Test notes',
        rating: 4,
        tags: ['test'],
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        opportunity: {
          id: 'opp1',
          title: 'Test Opportunity',
          description: 'Test description',
          overallScore: 7.5,
          viabilityThreshold: true,
          businessType: 'AI-Powered',
          industryVertical: 'Healthcare',
          niche: 'Telemedicine',
          createdAt: new Date(),
        },
        collection: {
          id: 'coll1',
          name: 'Test Collection',
          color: '#3B82F6',
          icon: '📁',
        },
      };

      mockPrisma.opportunityBookmark.findFirst.mockResolvedValue(mockBookmark);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1');
      const response = await GET(request, { params: Promise.resolve({ id: 'bookmark1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookmark).toMatchObject({
        id: 'bookmark1',
        userId: 'user123',
        opportunityId: 'opp1',
        collectionId: 'coll1',
        notes: 'Test notes',
        rating: 4,
        tags: ['test'],
        position: 1,
      });
      expect(mockPrisma.opportunityBookmark.findFirst).toHaveBeenCalledWith({
        where: { id: 'bookmark1', userId: 'user123' },
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
              description: true,
              overallScore: true,
              viabilityThreshold: true,
              businessType: true,
              industryVertical: true,
              niche: true,
              createdAt: true,
            },
          },
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

    test('should return 404 if bookmark not found', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      mockPrisma.opportunityBookmark.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Bookmark not found');
    });
  });

  describe('PUT /api/bookmarks/[id]', () => {
    test('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/test-id', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Collection' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should update bookmark', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockExistingBookmark = {
        id: 'bookmark1',
        userId: 'user123',
        opportunityId: 'opp1',
        collectionId: 'coll1',
      };

      const mockUpdatedBookmark = {
        id: 'bookmark1',
        userId: 'user123',
        opportunityId: 'opp1',
        collectionId: 'coll1',
        notes: 'Updated notes',
        rating: 5,
        tags: ['updated', 'test'],
        position: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        opportunity: {
          id: 'opp1',
          title: 'Test Opportunity',
          description: 'Test description',
          overallScore: 7.5,
          viabilityThreshold: true,
          businessType: 'AI-Powered',
          industryVertical: 'Healthcare',
          niche: 'Telemedicine',
          createdAt: new Date(),
        },
        collection: {
          id: 'coll1',
          name: 'Test Collection',
          color: '#3B82F6',
          icon: '📁',
        },
      };

      mockPrisma.opportunityBookmark.findFirst.mockResolvedValue(mockExistingBookmark);
      mockPrisma.opportunityBookmark.update.mockResolvedValue(mockUpdatedBookmark);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'PUT',
        body: JSON.stringify({
          notes: 'Updated notes',
          rating: 5,
          tags: ['updated', 'test'],
          position: 2,
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'bookmark1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookmark).toMatchObject({
        id: 'bookmark1',
        userId: 'user123',
        opportunityId: 'opp1',
        collectionId: 'coll1',
        notes: 'Updated notes',
        rating: 5,
        tags: ['updated', 'test'],
        position: 2,
      });
      expect(mockPrisma.opportunityBookmark.update).toHaveBeenCalledWith({
        where: { id: 'bookmark1' },
        data: {
          notes: 'Updated notes',
          rating: 5,
          tags: ['updated', 'test'],
          position: 2,
        },
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
              description: true,
              overallScore: true,
              viabilityThreshold: true,
              businessType: true,
              industryVertical: true,
              niche: true,
              createdAt: true,
            },
          },
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

    test('should return 404 if bookmark not found', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      mockPrisma.opportunityBookmark.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ notes: 'Updated notes' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Bookmark not found');
    });

    test('should handle validation errors', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'PUT',
        body: JSON.stringify({
          // Invalid rating should fail validation
          rating: 10,
          notes: 'Updated notes',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'bookmark1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('DELETE /api/bookmarks/[id]', () => {
    test('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/test-id', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should delete bookmark', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockExistingBookmark = {
        id: 'bookmark1',
        userId: 'user123',
        opportunityId: 'opp1',
        collectionId: 'coll1',
      };

      mockPrisma.opportunityBookmark.findFirst.mockResolvedValue(mockExistingBookmark);
      mockPrisma.opportunityBookmark.delete.mockResolvedValue(mockExistingBookmark);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'bookmark1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Bookmark deleted successfully');
      expect(mockPrisma.opportunityBookmark.delete).toHaveBeenCalledWith({
        where: { id: 'bookmark1' },
      });
    });

    test('should return 404 if bookmark not found', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      mockPrisma.opportunityBookmark.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Bookmark not found');
    });

    test('should handle database errors gracefully', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockExistingBookmark = {
        id: 'bookmark1',
        userId: 'user123',
      };
      
      mockPrisma.opportunityBookmark.findFirst.mockResolvedValue(mockExistingBookmark);
      mockPrisma.opportunityBookmark.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/bookmarks/bookmark1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'bookmark1' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete bookmark');
    });
  });
});