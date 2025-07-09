const { PrismaClient } = require('@prisma/client');

async function recoverLostData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== DATA RECOVERY ASSESSMENT ===\n');
    
    // Check current state
    const currentCounts = {
      redditPosts: await prisma.redditPost.count(),
      opportunities: await prisma.opportunity.count(),
      users: await prisma.user.count()
    };
    
    console.log('Current data counts:');
    console.log(`- Reddit Posts: ${currentCounts.redditPosts}`);
    console.log(`- Opportunities: ${currentCounts.opportunities}`);
    console.log(`- Users: ${currentCounts.users}`);
    
    // Check what data we still have
    const oldestPost = await prisma.redditPost.findFirst({
      orderBy: { createdUtc: 'asc' },
      select: { createdUtc: true, title: true, subreddit: true }
    });
    
    const newestPost = await prisma.redditPost.findFirst({
      orderBy: { createdUtc: 'desc' },
      select: { createdUtc: true, title: true, subreddit: true }
    });
    
    if (oldestPost && newestPost) {
      console.log(`\nRemaining data spans:`);
      console.log(`- Oldest: ${oldestPost.createdUtc.toISOString()} (${oldestPost.title.substring(0, 50)}...)`);
      console.log(`- Newest: ${newestPost.createdUtc.toISOString()} (${newestPost.title.substring(0, 50)}...)`);
    }
    
    // Estimate what we lost
    const expectedPosts = 263;
    const lostPosts = expectedPosts - currentCounts.redditPosts;
    
    console.log(`\n=== LOSS ASSESSMENT ===`);
    console.log(`- Expected posts: ${expectedPosts}`);
    console.log(`- Current posts: ${currentCounts.redditPosts}`);
    console.log(`- Lost posts: ${lostPosts}`);
    console.log(`- Data loss: ${((lostPosts / expectedPosts) * 100).toFixed(1)}%`);
    
    // Check subreddit distribution
    const subredditCounts = await prisma.redditPost.groupBy({
      by: ['subreddit'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    console.log(`\nRemaining posts by subreddit:`);
    subredditCounts.forEach(sr => {
      console.log(`- r/${sr.subreddit}: ${sr._count.id} posts`);
    });
    
    console.log(`\n=== RECOVERY RECOMMENDATIONS ===`);
    console.log(`1. Trigger comprehensive re-scraping of all subreddits`);
    console.log(`2. Focus on subreddits that had the most posts before`);
    console.log(`3. Set up automated backups before any future migrations`);
    console.log(`4. Re-analyze all posts to regenerate opportunities`);
    
    // Suggest recovery commands
    console.log(`\n=== RECOVERY COMMANDS ===`);
    console.log(`To recover data, run:`);
    console.log(`curl -X POST http://localhost:3000/api/trigger-mega-scraping`);
    console.log(`# This will re-scrape all configured subreddits`);
    
  } catch (error) {
    console.error('Error assessing data loss:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recoverLostData();