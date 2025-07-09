import { GET, PUT, DELETE } from '../route';
import { prisma } from '../../../../../lib/prisma';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

// Mock the prisma module
jest.mock('../../../../../lib/prisma', () => ({
  prisma: {
    bookmarkCollection: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock next-auth session
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  bookmarkCollection: {
    findUnique: jest.MockedFunction<() => Promise<unknown | null>>;
    update: jest.MockedFunction<() => Promise<unknown>>;
    delete: jest.MockedFunction<() => Promise<unknown>>;
  };
};

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/bookmarks/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    test('should return collection by ID', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockCollection = {
        id: 'coll1',
        userId: 'user123',
        name: 'Test Collection',
        description: 'Test description',
        color: '#3B82F6',
        icon: '📁',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bookmarks: [],
      };

      mockPrisma.bookmarkCollection.findUnique.mockResolvedValue(mockCollection);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/coll1');
      const response = await GET(request, { params: Promise.resolve({ id: 'coll1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.collection).toEqual(mockCollection);
      expect(mockPrisma.bookmarkCollection.findUnique).toHaveBeenCalledWith({
        where: { id: 'coll1', userId: 'user123' },
        include: {
          bookmarks: {
            include: {
              opportunity: {
                include: {
                  redditPost: true,
                },
              },
            },
          },
        },
      });
    });

    test('should return 404 if collection not found', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      mockPrisma.bookmarkCollection.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Collection not found');
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

    test('should update collection', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockUpdatedCollection = {
        id: 'coll1',
        userId: 'user123',
        name: 'Updated Collection',
        description: 'Updated description',
        color: '#10B981',
        icon: '⭐',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmarkCollection.update.mockResolvedValue(mockUpdatedCollection);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/coll1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Collection',
          description: 'Updated description',
          color: '#10B981',
          icon: '⭐',
          isPublic: true,
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'coll1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.collection).toEqual(mockUpdatedCollection);
      expect(mockPrisma.bookmarkCollection.update).toHaveBeenCalledWith({
        where: { id: 'coll1', userId: 'user123' },
        data: {
          name: 'Updated Collection',
          description: 'Updated description',
          color: '#10B981',
          icon: '⭐',
          isPublic: true,
        },
      });
    });

    test('should return 404 if collection not found', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const notFoundError = new Error('Record not found') as Error & { code: string };
      notFoundError.code = 'P2025';
      mockPrisma.bookmarkCollection.update.mockRejectedValue(notFoundError);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Collection' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Collection not found');
    });

    test('should handle validation errors', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/coll1', {
        method: 'PUT',
        body: JSON.stringify({
          // Empty name should fail validation
          name: '',
          description: 'Updated description',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'coll1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Name cannot be empty');
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

    test('should delete collection', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockDeletedCollection = {
        id: 'coll1',
        userId: 'user123',
        name: 'Test Collection',
      };

      mockPrisma.bookmarkCollection.delete.mockResolvedValue(mockDeletedCollection);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/coll1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'coll1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Collection deleted successfully');
      expect(mockPrisma.bookmarkCollection.delete).toHaveBeenCalledWith({
        where: { id: 'coll1', userId: 'user123' },
      });
    });

    test('should return 404 if collection not found', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      const notFoundError = new Error('Record not found') as Error & { code: string };
      notFoundError.code = 'P2025';
      mockPrisma.bookmarkCollection.delete.mockRejectedValue(notFoundError);

      const request = new NextRequest('http://localhost:3000/api/bookmarks/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Collection not found');
    });

    test('should handle database errors gracefully', async () => {
      const mockSession = {
        user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
      };
      mockGetServerSession.mockResolvedValue(mockSession);

      mockPrisma.bookmarkCollection.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/bookmarks/coll1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'coll1' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});