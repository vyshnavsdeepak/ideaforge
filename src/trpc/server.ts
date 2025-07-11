import { appRouter } from '@/server/api/root';
import { createInnerTRPCContext } from '@/server/api/trpc';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

/**
 * Server-side helper to call tRPC procedures directly on the server
 * This bypasses the HTTP layer and calls procedures directly
 */
export const createServerCaller = async () => {
  const headersList = headers();
  
  const ctx = await createInnerTRPCContext({
    headers: headersList,
    req: {} as NextRequest, // TODO: Properly type this when needed
  });
  
  return appRouter.createCaller(ctx);
};