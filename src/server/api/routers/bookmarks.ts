import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { ensureAdminUser } from '@/auth';

const createBookmarkSchema = z.object({
  opportunityId: z.string(),
  collectionId: z.string(),
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
});

const createCollectionSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const bookmarkActionSchema = z.object({
  opportunityId: z.string(),
  collectionId: z.string().optional(),
  action: z.enum(['bookmark', 'unbookmark']),
});

export const bookmarksRouter = createTRPCRouter({
  // Get all bookmarks for the current user
  getAll: protectedProcedure
    .input(z.object({
      collectionId: z.string().optional(),
      opportunityId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      
      const whereCondition: { userId: string; collectionId?: string; opportunityId?: string } = { 
        userId: user.id 
      };
      
      if (input?.collectionId) {
        whereCondition.collectionId = input.collectionId;
      }
      if (input?.opportunityId) {
        whereCondition.opportunityId = input.opportunityId;
      }

      const bookmarks = await ctx.prisma.opportunityBookmark.findMany({
        where: whereCondition,
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
              description: true,
              overallScore: true,
              viabilityThreshold: true,
              businessType: true,
              industryVertical: true,
              niche: true,
              createdAt: true,
            },
          },
          collection: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
        orderBy: [{ collectionId: 'asc' }, { position: 'asc' }],
      });

      return { bookmarks };
    }),

  // Create a new bookmark
  create: protectedProcedure
    .input(createBookmarkSchema)
    .mutation(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      // Check if opportunity exists
      const opportunity = await ctx.prisma.opportunity.findUnique({
        where: { id: input.opportunityId },
      });

      if (!opportunity) {
        throw new Error('Opportunity not found');
      }

      // Check if collection exists and belongs to user
      const collection = await ctx.prisma.bookmarkCollection.findFirst({
        where: { 
          id: input.collectionId,
          userId: user.id,
        },
      });

      if (!collection) {
        throw new Error('Collection not found');
      }

      // Check if bookmark already exists
      const existingBookmark = await ctx.prisma.opportunityBookmark.findUnique({
        where: {
          userId_opportunityId_collectionId: {
            userId: user.id,
            opportunityId: input.opportunityId,
            collectionId: input.collectionId,
          },
        },
      });

      if (existingBookmark) {
        throw new Error('Opportunity already bookmarked in this collection');
      }

      // Get the next position in the collection
      const lastBookmark = await ctx.prisma.opportunityBookmark.findFirst({
        where: { 
          userId: user.id,
          collectionId: input.collectionId,
        },
        orderBy: { position: 'desc' },
      });

      const nextPosition = (lastBookmark?.position || 0) + 1;

      const bookmark = await ctx.prisma.opportunityBookmark.create({
        data: {
          userId: user.id,
          opportunityId: input.opportunityId,
          collectionId: input.collectionId,
          notes: input.notes,
          rating: input.rating,
          tags: input.tags || [],
          position: nextPosition,
        },
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
              description: true,
              overallScore: true,
              viabilityThreshold: true,
              businessType: true,
              industryVertical: true,
              niche: true,
              createdAt: true,
            },
          },
          collection: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      });

      return { bookmark };
    }),

  // Update a bookmark
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      notes: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
      tags: z.array(z.string()).optional(),
      position: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      // Verify bookmark belongs to user
      const existingBookmark = await ctx.prisma.opportunityBookmark.findFirst({
        where: {
          id: input.id,
          userId: user.id,
        },
      });

      if (!existingBookmark) {
        throw new Error('Bookmark not found');
      }

      const bookmark = await ctx.prisma.opportunityBookmark.update({
        where: { id: input.id },
        data: {
          notes: input.notes,
          rating: input.rating,
          tags: input.tags,
          position: input.position,
          updatedAt: new Date(),
        },
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
              description: true,
              overallScore: true,
              viabilityThreshold: true,
              businessType: true,
              industryVertical: true,
              niche: true,
              createdAt: true,
            },
          },
          collection: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      });

      return { bookmark };
    }),

  // Delete a bookmark
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      // Verify bookmark belongs to user
      const existingBookmark = await ctx.prisma.opportunityBookmark.findFirst({
        where: {
          id: input.id,
          userId: user.id,
        },
      });

      if (!existingBookmark) {
        throw new Error('Bookmark not found');
      }

      await ctx.prisma.opportunityBookmark.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Check bookmark status for an opportunity
  checkStatus: protectedProcedure
    .input(z.object({
      opportunityId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      // Get all bookmarks for this opportunity
      const bookmarks = await ctx.prisma.opportunityBookmark.findMany({
        where: { 
          userId: user.id,
          opportunityId: input.opportunityId,
        },
        include: {
          collection: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      });

      // Get all collections for the dropdown
      const collections = await ctx.prisma.bookmarkCollection.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
        },
        orderBy: { name: 'asc' },
      });

      return { 
        isBookmarked: bookmarks.length > 0,
        bookmarks,
        collections,
      };
    }),

  // Quick bookmark/unbookmark action
  toggleBookmark: protectedProcedure
    .input(bookmarkActionSchema)
    .mutation(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      if (input.action === 'bookmark') {
        // Add to collection or default collection
        let targetCollectionId = input.collectionId;
        
        if (!targetCollectionId) {
          // Create or get default collection
          let defaultCollection = await ctx.prisma.bookmarkCollection.findFirst({
            where: { 
              userId: user.id,
              name: 'Saved Opportunities',
            },
          });

          if (!defaultCollection) {
            defaultCollection = await ctx.prisma.bookmarkCollection.create({
              data: {
                userId: user.id,
                name: 'Saved Opportunities',
                description: 'Default collection for saved opportunities',
                icon: '⭐',
              },
            });
          }

          targetCollectionId = defaultCollection.id;
        }

        // Check if already bookmarked in this collection
        const existingBookmark = await ctx.prisma.opportunityBookmark.findUnique({
          where: {
            userId_opportunityId_collectionId: {
              userId: user.id,
              opportunityId: input.opportunityId,
              collectionId: targetCollectionId,
            },
          },
        });

        if (existingBookmark) {
          throw new Error('Already bookmarked in this collection');
        }

        // Get the next position in the collection
        const lastBookmark = await ctx.prisma.opportunityBookmark.findFirst({
          where: { 
            userId: user.id,
            collectionId: targetCollectionId,
          },
          orderBy: { position: 'desc' },
        });

        const nextPosition = (lastBookmark?.position || 0) + 1;

        const bookmark = await ctx.prisma.opportunityBookmark.create({
          data: {
            userId: user.id,
            opportunityId: input.opportunityId,
            collectionId: targetCollectionId,
            position: nextPosition,
          },
          include: {
            collection: {
              select: {
                id: true,
                name: true,
                color: true,
                icon: true,
              },
            },
          },
        });

        return { 
          success: true,
          action: 'bookmarked',
          bookmark,
        };
      } else if (input.action === 'unbookmark') {
        // Remove from specific collection or all collections
        if (input.collectionId) {
          await ctx.prisma.opportunityBookmark.deleteMany({
            where: {
              userId: user.id,
              opportunityId: input.opportunityId,
              collectionId: input.collectionId,
            },
          });
        } else {
          await ctx.prisma.opportunityBookmark.deleteMany({
            where: {
              userId: user.id,
              opportunityId: input.opportunityId,
            },
          });
        }

        return { 
          success: true,
          action: 'unbookmarked',
        };
      } else {
        throw new Error('Invalid action');
      }
    }),

  // Get all collections
  getAllCollections: protectedProcedure.query(async ({ ctx }) => {
    // Ensure admin user exists
    const user = await ensureAdminUser();
    const collections = await ctx.prisma.bookmarkCollection.findMany({
      where: { userId: user.id },
      include: {
        bookmarks: {
          include: {
            opportunity: {
              select: {
                id: true,
                title: true,
                description: true,
                overallScore: true,
                viabilityThreshold: true,
                businessType: true,
                industryVertical: true,
                niche: true,
                createdAt: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { bookmarks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { collections };
  }),

  // Create a new collection
  createCollection: protectedProcedure
    .input(createCollectionSchema)
    .mutation(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      // Check if collection name already exists for this user
      const existingCollection = await ctx.prisma.bookmarkCollection.findUnique({
        where: { 
          userId_name: { 
            userId: user.id, 
            name: input.name 
          } 
        },
      });

      if (existingCollection) {
        throw new Error('A collection with this name already exists');
      }

      const collection = await ctx.prisma.bookmarkCollection.create({
        data: {
          userId: user.id,
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
          isPublic: input.isPublic ?? false,
        },
        include: {
          _count: {
            select: { bookmarks: true },
          },
        },
      });

      return { collection };
    }),

  // Update a collection
  updateCollection: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(50).optional(),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      icon: z.string().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      // Verify collection belongs to user
      const existingCollection = await ctx.prisma.bookmarkCollection.findFirst({
        where: {
          id: input.id,
          userId: user.id,
        },
      });

      if (!existingCollection) {
        throw new Error('Collection not found');
      }

      // Check if new name conflicts with existing collection
      if (input.name && input.name !== existingCollection.name) {
        const nameConflict = await ctx.prisma.bookmarkCollection.findUnique({
          where: { 
            userId_name: { 
              userId: user.id, 
              name: input.name 
            } 
          },
        });

        if (nameConflict) {
          throw new Error('A collection with this name already exists');
        }
      }

      const collection = await ctx.prisma.bookmarkCollection.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          color: input.color,
          icon: input.icon,
          isPublic: input.isPublic,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: { bookmarks: true },
          },
        },
      });

      return { collection };
    }),

  // Delete a collection
  deleteCollection: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure admin user exists
      const user = await ensureAdminUser();
      // Verify collection belongs to user
      const existingCollection = await ctx.prisma.bookmarkCollection.findFirst({
        where: {
          id: input.id,
          userId: user.id,
        },
      });

      if (!existingCollection) {
        throw new Error('Collection not found');
      }

      // Delete all bookmarks in this collection first
      await ctx.prisma.opportunityBookmark.deleteMany({
        where: {
          collectionId: input.id,
          userId: user.id,
        },
      });

      // Delete the collection
      await ctx.prisma.bookmarkCollection.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});