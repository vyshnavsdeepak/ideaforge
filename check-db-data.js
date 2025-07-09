const { PrismaClient } = require('@prisma/client');

async function checkData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking database data...\n');
    
    const redditPostCount = await prisma.redditPost.count();
    console.log(`Reddit Posts: ${redditPostCount}`);
    
    const opportunityCount = await prisma.opportunity.count();
    console.log(`Opportunities: ${opportunityCount}`);
    
    const userCount = await prisma.user.count();
    console.log(`Users: ${userCount}`);
    
    // Check sample of recent posts
    const recentPosts = await prisma.redditPost.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        subreddit: true,
        createdAt: true,
        createdUtc: true
      }
    });
    
    console.log('\nRecent Reddit Posts:');
    recentPosts.forEach(post => {
      console.log(`- ${post.title.substring(0, 60)}... (r/${post.subreddit}) - ${post.createdAt.toISOString()}`);
    });
    
    // Check if we have any posts from before the migration
    const oldPosts = await prisma.redditPost.findMany({
      where: {
        createdAt: {
          lt: new Date('2025-07-09T15:00:00Z') // Before the migration
        }
      },
      take: 3,
      select: {
        id: true,
        title: true,
        subreddit: true,
        createdAt: true
      }
    });
    
    console.log(`\nPosts from before migration (should be 263): ${oldPosts.length > 0 ? 'YES' : 'NO'}`);
    if (oldPosts.length > 0) {
      oldPosts.forEach(post => {
        console.log(`- ${post.title.substring(0, 60)}... (r/${post.subreddit})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();