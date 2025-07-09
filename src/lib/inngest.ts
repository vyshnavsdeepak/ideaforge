import { Inngest } from "inngest";

// Create Inngest client with proper environment handling
export const inngest = new Inngest({
  id: "reddit-opportunity-finder",
  name: "Reddit AI Opportunity Finder",
  // Only set eventKey if provided (for cloud/production mode)
  ...(process.env.INNGEST_EVENT_KEY && { eventKey: process.env.INNGEST_EVENT_KEY }),
  // Optional: Set environment-specific options
  ...(process.env.NODE_ENV === "development" && {
    isDev: true,
  }),
});