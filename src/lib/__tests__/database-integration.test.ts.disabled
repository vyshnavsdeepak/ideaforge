/**
 * Database Integration Tests
 * These tests require a real database connection and are designed to run
 * against a test database to verify schema integrity and relationships.
 */

import { PrismaClient } from '@prisma/client';

// Skip these tests in CI or when DATABASE_URL is not available
const skipTests = !process.env.DATABASE_URL || process.env.CI;

// Create a separate Prisma instance for testing
const testPrisma = skipTests ? null : new PrismaClient();

describe('Database Schema Integration Tests', () => {
  beforeAll(async () => {
    if (skipTests) return;
    
    // Ensure database is connected
    await testPrisma?.$connect();
  });

  afterAll(async () => {
    if (skipTests) return;
    
    // Clean up any test data and disconnect
    await testPrisma?.$disconnect();
  });

  describe('Schema Validation', () => {
    test('should validate that all required tables exist', async () => {
      if (skipTests) {
        console.log('Skipping database integration tests - no DATABASE_URL or running in CI');
        return;
      }

      // Test that we can query the basic tables
      const tablesExist = await Promise.all([
        testPrisma!.$queryRaw`SELECT 1 FROM "RedditPost" LIMIT 1`.catch(() => false),
        testPrisma!.$queryRaw`SELECT 1 FROM "Opportunity" LIMIT 1`.catch(() => false),
        testPrisma!.$queryRaw`SELECT 1 FROM "User" LIMIT 1`.catch(() => false),
      ]);

      expect(tablesExist.every(exists => exists !== false)).toBe(true);
    });

    test('should validate RedditPost schema structure', async () => {
      if (skipTests) return;

      // Test that RedditPost has the expected columns
      const result = await testPrisma!.$queryRaw`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'RedditPost'
        ORDER BY column_name
      ` as Array<{column_name: string, data_type: string, is_nullable: string}>;

      const columns = result.map(r => r.column_name);
      
      // Check for required columns
      expect(columns).toContain('id');
      expect(columns).toContain('redditId');
      expect(columns).toContain('title');
      expect(columns).toContain('subreddit');
      expect(columns).toContain('author');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('processedAt');
    });

    test('should validate Opportunity schema structure with categorization fields', async () => {
      if (skipTests) return;

      // Test that Opportunity has all the categorization columns
      const result = await testPrisma!.$queryRaw`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'Opportunity'
        ORDER BY column_name
      ` as Array<{column_name: string, data_type: string, is_nullable: string}>;

      const columns = result.map(r => r.column_name);
      
      // Check for basic columns
      expect(columns).toContain('id');
      expect(columns).toContain('title');
      expect(columns).toContain('description');
      expect(columns).toContain('proposedSolution');
      expect(columns).toContain('overallScore');
      expect(columns).toContain('viabilityThreshold');
      
      // Check for Delta 4 score columns
      expect(columns).toContain('speedScore');
      expect(columns).toContain('convenienceScore');
      expect(columns).toContain('trustScore');
      expect(columns).toContain('priceScore');
      
      // Check for new categorization columns
      expect(columns).toContain('businessType');
      expect(columns).toContain('businessModel');
      expect(columns).toContain('revenueModel');
      expect(columns).toContain('pricingModel');
      expect(columns).toContain('platform');
      expect(columns).toContain('industryVertical');
      expect(columns).toContain('targetAudience');
      expect(columns).toContain('developmentComplexity');
      expect(columns).toContain('capitalRequirement');
      expect(columns).toContain('marketSizeCategory');
      expect(columns).toContain('competitionLevel');
      expect(columns).toContain('growthPotential');
    });

    test('should validate database indexes exist', async () => {
      if (skipTests) return;

      // Check that important indexes exist
      const indexes = await testPrisma!.$queryRaw`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename IN ('RedditPost', 'Opportunity')
      ` as Array<{indexname: string, tablename: string}>;

      const indexNames = indexes.map(i => i.indexname);
      
      // Check for primary keys
      expect(indexNames.some(name => name.includes('pkey'))).toBe(true);
      
      // Check for unique constraints
      expect(indexNames.some(name => name.includes('redditId'))).toBe(true);
      expect(indexNames.some(name => name.includes('redditPostId'))).toBe(true);
    });
  });

  describe('Database Connection Health', () => {
    test('should successfully connect to database', async () => {
      if (skipTests) return;

      // Simple query to test connection
      const result = await testPrisma!.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    test('should handle concurrent queries', async () => {
      if (skipTests) return;

      // Test multiple concurrent queries
      const queries = Array.from({ length: 5 }, (_, i) => 
        testPrisma!.$queryRaw`SELECT ${i} as query_number`
      );

      const results = await Promise.all(queries);
      expect(results).toHaveLength(5);
    });
  });

  describe('Migration Verification', () => {
    test('should verify migration state is up to date', async () => {
      if (skipTests) return;

      // Check that migrations table exists and has records
      const migrations = await testPrisma!.$queryRaw`
        SELECT * FROM "_prisma_migrations" 
        ORDER BY finished_at DESC 
        LIMIT 1
      ` as Array<{migration_name: string, finished_at: Date}>;

      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations[0].migration_name).toBeTruthy();
    });
  });
});

// Export test utilities for other tests
export const testUtils = {
  skipTests,
  testPrisma,
};