import { serve } from "inngest/next";
import { inngest } from "@/shared";
import { allFunctions } from "../../../inngest";

// Serve Inngest functions with proper configuration for Vercel
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions as Parameters<typeof serve>[0]['functions'],
  // Only use signing key if provided
  ...(process.env.INNGEST_SIGNING_KEY && { signingKey: process.env.INNGEST_SIGNING_KEY }),
  // Set the base URL for Vercel deployments
  servePath: "/api/inngest",
  // Enable streaming for better performance
  streaming: "allow",
});