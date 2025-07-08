import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest";
import { scrapeSubreddit, analyzeOpportunity, dailyRedditScrape } from "../../../inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scrapeSubreddit,
    analyzeOpportunity,
    dailyRedditScrape,
  ],
});