import { createTRPCRouter } from './trpc';
import { systemRouter } from './routers/system';
import { jobsRouter } from './routers/jobs';
import { opportunitiesRouter } from './routers/opportunities';
import { bookmarksRouter } from './routers/bookmarks';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  system: systemRouter,
  jobs: jobsRouter,
  opportunities: opportunitiesRouter,
  bookmarks: bookmarksRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;