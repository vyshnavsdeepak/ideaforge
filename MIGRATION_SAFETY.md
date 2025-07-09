# Migration Safety Guidelines

## What Happened
On July 9, 2025, we lost 217 Reddit posts (from 263 to 46) during the bookmark system migration. This was a critical failure that should never happen in production.

## Root Cause
The migration was supposed to be additive-only, but likely a `prisma migrate reset --force` was run due to schema drift, causing complete data loss.

## Immediate Safeguards

### 1. Pre-Migration Checks
Before any migration:
```bash
# Always check current data counts
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const counts = {
    redditPosts: await prisma.redditPost.count(),
    opportunities: await prisma.opportunity.count(),
    users: await prisma.user.count()
  };
  console.log('Pre-migration counts:', counts);
  await prisma.\$disconnect();
})();
"
```

### 2. Migration Safety Rules
- **NEVER** run `prisma migrate reset` with existing data
- **ALWAYS** use `prisma migrate deploy` for production-like environments
- **ALWAYS** backup data before major migrations
- **ALWAYS** test migrations on a copy of production data first

### 3. Required Migration Pattern
```sql
-- ✅ SAFE: Adding new tables
CREATE TABLE "NewTable" (...);

-- ✅ SAFE: Adding new columns with defaults
ALTER TABLE "ExistingTable" ADD COLUMN "newColumn" TEXT DEFAULT 'default_value';

-- ✅ SAFE: Adding new indexes
CREATE INDEX "idx_name" ON "Table"("column");

-- ❌ UNSAFE: Dropping tables
DROP TABLE "Table";

-- ❌ UNSAFE: Dropping columns
ALTER TABLE "Table" DROP COLUMN "column";

-- ❌ UNSAFE: Changing column types without data migration
ALTER TABLE "Table" ALTER COLUMN "column" SET DATA TYPE INTEGER;
```

### 4. Data Recovery Plan
Since we lost the data, we need to:
1. Re-scrape Reddit posts from the same time period
2. Re-analyze posts to regenerate opportunities
3. Implement automated backups going forward

## Going Forward

### 1. Automated Backups
```bash
# Daily backup script
pg_dump $DATABASE_URL > backups/backup_$(date +%Y%m%d).sql
```

### 2. Migration Testing
- Test all migrations on development database first
- Use `prisma migrate diff` to review changes
- Never use `--force` flags in production-like environments

### 3. Data Validation
- Always validate data counts before/after migrations
- Implement data integrity checks
- Add monitoring for unexpected data changes

## Recovery Actions Needed
1. Re-scrape lost Reddit posts
2. Re-analyze posts to regenerate opportunities
3. Implement backup system
4. Add migration safety checks to CI/CD

## Lesson Learned
**Data is irreplaceable.** We must treat every migration as if it's running in production, with proper safeguards and backups.