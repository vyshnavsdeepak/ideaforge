import { prisma } from '@/shared/services/prisma';

export interface SubredditConfig {
  id: string;
  name: string;
  isActive: boolean;
  priority: string;
  scrapeFrequency: string;
  maxPosts: number;
  sortBy: string;
  description: string | null;
  category: string | null;
  totalPostsScraped: number;
  opportunitiesFound: number;
  lastScraped: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Default subreddits to seed the database
export const DEFAULT_SUBREDDITS = [
  { name: 'entrepreneur', category: 'Business', priority: 'high' },
  { name: 'startups', category: 'Business', priority: 'high' },
  { name: 'smallbusiness', category: 'Business', priority: 'medium' },
  { name: 'business', category: 'Business', priority: 'medium' },
  { name: 'accounting', category: 'Business', priority: 'low' },
  { name: 'finance', category: 'Business', priority: 'medium' },
  { name: 'investing', category: 'Business', priority: 'medium' },
  { name: 'legaladvice', category: 'Legal', priority: 'low' },
  { name: 'lawyers', category: 'Legal', priority: 'low' },
  { name: 'medicine', category: 'Healthcare', priority: 'low' },
  { name: 'healthcare', category: 'Healthcare', priority: 'low' },
  { name: 'programming', category: 'Technology', priority: 'high' },
  { name: 'webdev', category: 'Technology', priority: 'high' },
  { name: 'datascience', category: 'Technology', priority: 'medium' },
  { name: 'MachineLearning', category: 'Technology', priority: 'medium' },
  { name: 'artificialintelligence', category: 'Technology', priority: 'high' },
  { name: 'PromptEngineering', category: 'Technology', priority: 'medium' },
  { name: 'Instagram', category: 'Technology', priority: 'medium' },
] as const;

/**
 * Get all active subreddits from the database
 */
export async function getActiveSubreddits(): Promise<SubredditConfig[]> {
  try {
    const subreddits = await prisma.subredditConfig.findMany({
      where: { isActive: true },
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' },
      ],
    });

    return subreddits;
  } catch (error) {
    console.error('Error fetching active subreddits:', error);
    // Fallback to default list if database fails
    return DEFAULT_SUBREDDITS.map(sub => ({
      id: `fallback-${sub.name}`,
      name: sub.name,
      isActive: true,
      priority: sub.priority,
      scrapeFrequency: 'hourly',
      maxPosts: 25,
      sortBy: 'hot',
      category: sub.category,
      description: null,
      totalPostsScraped: 0,
      opportunitiesFound: 0,
      lastScraped: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}

/**
 * Get subreddit names only (for backwards compatibility)
 */
export async function getActiveSubredditNames(): Promise<string[]> {
  const subreddits = await getActiveSubreddits();
  return subreddits.map(sub => sub.name);
}

/**
 * Seed the database with default subreddits if none exist
 */
export async function seedDefaultSubreddits(): Promise<void> {
  try {
    const existingCount = await prisma.subredditConfig.count();
    
    if (existingCount === 0) {
      console.log('🌱 Seeding default subreddits...');
      
      await prisma.subredditConfig.createMany({
        data: DEFAULT_SUBREDDITS.map(sub => ({
          name: sub.name,
          category: sub.category,
          priority: sub.priority,
          isActive: true,
          scrapeFrequency: 'hourly',
          maxPosts: 25,
          sortBy: 'hot',
        })),
      });
      
      console.log(`✅ Seeded ${DEFAULT_SUBREDDITS.length} default subreddits`);
    }
  } catch (error) {
    console.error('Error seeding default subreddits:', error);
  }
}

/**
 * Update subreddit statistics after scraping
 */
export async function updateSubredditStats(
  subredditName: string,
  postsScraped: number,
  opportunitiesFound: number = 0
): Promise<void> {
  try {
    await prisma.subredditConfig.update({
      where: { name: subredditName },
      data: {
        totalPostsScraped: {
          increment: postsScraped,
        },
        opportunitiesFound: {
          increment: opportunitiesFound,
        },
        lastScraped: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error updating stats for r/${subredditName}:`, error);
  }
}

/**
 * Get subreddit configuration by name
 */
export async function getSubredditConfig(name: string): Promise<SubredditConfig | null> {
  try {
    const config = await prisma.subredditConfig.findUnique({
      where: { name },
    });
    return config;
  } catch (error) {
    console.error(`Error fetching config for r/${name}:`, error);
    return null;
  }
}