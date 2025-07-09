import { Inngest } from "inngest";

// Create Inngest client with proper environment handling for Vercel
export const inngest = new Inngest({
  id: "reddit-opportunity-finder",
  name: "Reddit AI Opportunity Finder",
  // Only set eventKey if provided (for cloud mode)
  ...(process.env.INNGEST_EVENT_KEY && { eventKey: process.env.INNGEST_EVENT_KEY }),
  // Use retries with exponential backoff
  retries: {
    attempts: 3,
    backoff: "exponential",
  },
});