import { prisma } from './prisma';

/**
 * Ensures the admin user exists in the database
 * This is called when the bookmark system needs to associate data with a user
 * but the admin user hasn't been created yet (e.g., hasn't signed out/in after auth changes)
 */
export async function ensureAdminUser() {
  const adminEmail = 'admin@ideaforge.com';
  
  try {
    // First, try to find the admin user
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return existingUser;
    }

    // If not found, create the admin user
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
      },
    });

    console.log('Created admin user for bookmarks system');
    return adminUser;
  } catch (error) {
    console.error('Error ensuring admin user exists:', error);
    throw error;
  }
}