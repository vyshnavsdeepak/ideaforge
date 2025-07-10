import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding database with sample data...');
    
    const sampleData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'sample-data-2025-07-10.json'), 'utf8')
    );
    
    // Seed data here - implement based on your needs
    // Note: You'll need to handle relations and IDs carefully
    console.log(`Sample data loaded: ${Object.keys(sampleData).join(', ')}`);
    
    // Example implementation would go here
    // await prisma.redditPost.createMany({ data: sampleData.redditPosts });
    // etc.
    
    console.log('✅ Seeding completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();