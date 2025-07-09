#!/usr/bin/env tsx

/**
 * Test script for Reddit OAuth authentication
 * Run with: npx tsx src/scripts/test-reddit-auth.ts
 */

import { createRedditAuthClient } from '../lib/reddit-auth';
import { createRedditClient } from '../lib/reddit';

async function testRedditAuth() {
  console.log('🔧 Testing Reddit OAuth Authentication\n');

  // Test 1: Check environment variables
  console.log('1. Checking environment variables...');
  const requiredVars = ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_USERNAME', 'REDDIT_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:', missingVars.join(', '));
    console.log('\nPlease add these to your .env.local file:');
    missingVars.forEach(varName => {
      console.log(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    console.log('\nSee docs/REDDIT_OAUTH_SETUP.md for detailed instructions.');
    return;
  }
  console.log('✅ All environment variables are set\n');

  // Test 2: Create auth client
  console.log('2. Creating Reddit auth client...');
  const authClient = createRedditAuthClient();
  
  if (!authClient) {
    console.log('❌ Failed to create auth client');
    return;
  }
  console.log('✅ Auth client created successfully\n');

  // Test 3: Test authentication
  console.log('3. Testing authentication...');
  try {
    const isAuthenticated = await authClient.testAuth();
    if (isAuthenticated) {
      console.log('✅ Authentication successful!\n');
    } else {
      console.log('❌ Authentication failed - invalid response\n');
      return;
    }
  } catch (error) {
    console.log('❌ Authentication failed:', (error as Error).message);
    console.log('\nCommon fixes:');
    console.log('- Verify your Reddit username and password');
    console.log('- Check that your Reddit app is set to "script" type');
    console.log('- Ensure your Reddit account is not suspended');
    return;
  }

  // Test 4: Test subreddit access
  console.log('4. Testing subreddit access...');
  const client = createRedditClient();
  
  try {
    console.log('   Fetching r/test posts...');
    const posts = await client.fetchSubredditPosts('test', 'hot', 5);
    console.log(`✅ Successfully fetched ${posts.length} posts from r/test\n`);
    
    if (posts.length > 0) {
      console.log('Sample post:');
      const post = posts[0];
      console.log(`   Title: ${post.title.substring(0, 60)}...`);
      console.log(`   Author: ${post.author}`);
      console.log(`   Score: ${post.score}`);
      console.log(`   Comments: ${post.numComments}\n`);
    }
  } catch (error) {
    console.log('❌ Failed to fetch posts:', (error as Error).message);
    return;
  }

  // Test 5: Test previously blocked subreddit
  console.log('5. Testing access to r/healthcare (previously blocked)...');
  try {
    const posts = await client.fetchSubredditPosts('healthcare', 'hot', 3);
    console.log(`✅ Successfully accessed r/healthcare! Fetched ${posts.length} posts`);
    
    if (posts.length > 0) {
      console.log('   This subreddit was previously blocked, but now works with auth!');
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('private') || errorMessage.includes('restricted')) {
      console.log('ℹ️  r/healthcare may be private/restricted, but auth is working');
    } else {
      console.log('⚠️  Still having issues with r/healthcare:', errorMessage);
    }
  }

  console.log('\n🎉 Reddit OAuth authentication is working correctly!');
  console.log('\nNext steps:');
  console.log('- Your scraping should now have higher rate limits (60/minute vs 10/minute)');
  console.log('- Previously blocked subreddits should now be accessible');
  console.log('- Monitor logs for "[REDDIT_AUTH]" messages during scraping');
}

// Run the test
testRedditAuth().catch(console.error);