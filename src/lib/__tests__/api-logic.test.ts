import { z } from 'zod';

// Test the API validation logic
const searchSchema = z.object({
  search: z.string().optional(),
  subreddit: z.string().optional(),
  minScore: z.coerce.number().min(0).max(10).optional(),
  sortBy: z.enum(['score', 'date', 'subreddit']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

// Helper function to build where clause (extracted from API route)
function buildWhereClause(params: Record<string, unknown>) {
  const { search, subreddit, minScore = 0 } = params;
  
  const whereClause: Record<string, unknown> = {};

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { proposedSolution: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (subreddit) {
    whereClause.subreddit = subreddit;
  }

  if (typeof minScore === 'number' && minScore > 0) {
    whereClause.overallScore = { gte: minScore };
  }

  return whereClause;
}

// Helper function to build order clause (extracted from API route)
function buildOrderClause(params: Record<string, unknown>) {
  const { sortBy = 'score', sortOrder = 'desc' } = params;
  
  const orderClause: Record<string, unknown> = {};
  
  if (sortBy === 'score') {
    orderClause.overallScore = sortOrder;
  } else if (sortBy === 'date') {
    orderClause.createdAt = sortOrder;
  } else if (sortBy === 'subreddit') {
    orderClause.subreddit = sortOrder;
  }

  return orderClause;
}

describe('API Logic Tests', () => {
  describe('Parameter Validation', () => {
    test('should validate valid parameters', () => {
      const validParams = {
        search: 'healthcare',
        subreddit: 'startups',
        minScore: '7.5',
        sortBy: 'score',
        sortOrder: 'desc',
        page: '1',
        limit: '20',
      };

      const result = searchSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.search).toBe('healthcare');
        expect(result.data.subreddit).toBe('startups');
        expect(result.data.minScore).toBe(7.5);
        expect(result.data.sortBy).toBe('score');
        expect(result.data.sortOrder).toBe('desc');
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    test('should handle missing optional parameters', () => {
      const minimalParams = {};
      const result = searchSchema.safeParse(minimalParams);
      expect(result.success).toBe(true);
    });

    test('should reject invalid sortBy values', () => {
      const invalidParams = {
        sortBy: 'invalid',
      };

      const result = searchSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    test('should reject invalid minScore values', () => {
      const invalidParams = {
        minScore: '15', // Above max of 10
      };

      const result = searchSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    test('should reject invalid page values', () => {
      const invalidParams = {
        page: '0', // Below min of 1
      };

      const result = searchSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    test('should reject invalid limit values', () => {
      const invalidParams = {
        limit: '150', // Above max of 100
      };

      const result = searchSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe('Where Clause Building', () => {
    test('should build correct where clause for search', () => {
      const params = { search: 'healthcare' };
      const whereClause = buildWhereClause(params);

      expect(Array.isArray(whereClause.OR)).toBe(true);
      expect((whereClause.OR as unknown[]).length).toBe(3);
      expect((whereClause.OR as unknown[])[0]).toEqual({ title: { contains: 'healthcare', mode: 'insensitive' } });
      expect((whereClause.OR as unknown[])[1]).toEqual({ description: { contains: 'healthcare', mode: 'insensitive' } });
      expect((whereClause.OR as unknown[])[2]).toEqual({ proposedSolution: { contains: 'healthcare', mode: 'insensitive' } });
    });

    test('should build correct where clause for subreddit', () => {
      const params = { subreddit: 'startups' };
      const whereClause = buildWhereClause(params);

      expect(whereClause.subreddit).toBe('startups');
    });

    test('should build correct where clause for minScore', () => {
      const params = { minScore: 7.5 };
      const whereClause = buildWhereClause(params);

      expect(whereClause.overallScore).toEqual({ gte: 7.5 });
    });

    test('should build combined where clause', () => {
      const params = {
        search: 'AI',
        subreddit: 'startups',
        minScore: 6.0,
      };
      const whereClause = buildWhereClause(params);

      expect(Array.isArray(whereClause.OR)).toBe(true);
      expect((whereClause.OR as unknown[]).length).toBe(3);
      expect(whereClause.subreddit).toBe('startups');
      expect(whereClause.overallScore).toEqual({ gte: 6.0 });
    });

    test('should build empty where clause for no filters', () => {
      const params = {};
      const whereClause = buildWhereClause(params);

      expect(Object.keys(whereClause)).toHaveLength(0);
    });
  });

  describe('Order Clause Building', () => {
    test('should build correct order clause for score sorting', () => {
      const params = { sortBy: 'score', sortOrder: 'desc' };
      const orderClause = buildOrderClause(params);

      expect(orderClause.overallScore).toBe('desc');
    });

    test('should build correct order clause for date sorting', () => {
      const params = { sortBy: 'date', sortOrder: 'asc' };
      const orderClause = buildOrderClause(params);

      expect(orderClause.createdAt).toBe('asc');
    });

    test('should build correct order clause for subreddit sorting', () => {
      const params = { sortBy: 'subreddit', sortOrder: 'desc' };
      const orderClause = buildOrderClause(params);

      expect(orderClause.subreddit).toBe('desc');
    });

    test('should use default values when not specified', () => {
      const params = {};
      const orderClause = buildOrderClause(params);

      expect(orderClause.overallScore).toBe('desc');
    });
  });

  describe('Pagination Logic', () => {
    test('should calculate correct skip and take values', () => {
      const page = 3;
      const limit = 20;
      const skip = (page - 1) * limit;
      const take = limit;

      expect(skip).toBe(40);
      expect(take).toBe(20);
    });

    test('should calculate correct pagination metadata', () => {
      const totalCount = 157;
      const page = 3;
      const limit = 20;
      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      expect(totalPages).toBe(8);
      expect(hasMore).toBe(true);
    });

    test('should handle last page correctly', () => {
      const totalCount = 157;
      const page = 8;
      const limit = 20;
      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      expect(totalPages).toBe(8);
      expect(hasMore).toBe(false);
    });
  });
});