-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "competitiveAnalysis" TEXT DEFAULT 'Unknown',
ADD COLUMN     "customerType" TEXT DEFAULT 'Unknown',
ADD COLUMN     "engagementLevel" TEXT DEFAULT 'Unknown',
ADD COLUMN     "marketValidationScore" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "paymentWillingness" TEXT DEFAULT 'Unknown',
ADD COLUMN     "problemFrequency" TEXT DEFAULT 'Unknown',
ADD COLUMN     "validationTier" TEXT DEFAULT 'Unknown';

-- AlterTable
ALTER TABLE "RedditPost" ADD COLUMN     "aiAnalysisDate" TIMESTAMP(3),
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "commentAnalysisCompleted" TIMESTAMP(3),
ADD COLUMN     "commentAnalysisError" TEXT,
ADD COLUMN     "commentAnalysisJobId" TEXT,
ADD COLUMN     "commentAnalysisStarted" TIMESTAMP(3),
ADD COLUMN     "commentAnalysisStatus" TEXT,
ADD COLUMN     "commentOpportunitiesFound" INTEGER DEFAULT 0,
ADD COLUMN     "isOpportunity" BOOLEAN,
ADD COLUMN     "rejectionReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'subreddit_scrape',
ADD COLUMN     "sourceUserId" TEXT;

-- CreateTable
CREATE TABLE "RedditPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "redditId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "permalink" TEXT,
    "subreddit" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdUtc" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,
    "isTopLevel" BOOLEAN NOT NULL DEFAULT false,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "isSubmitter" BOOLEAN NOT NULL DEFAULT false,
    "scoreHidden" BOOLEAN NOT NULL DEFAULT false,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisDate" TIMESTAMP(3),
    "isOpportunity" BOOLEAN,
    "opportunityId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedditPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookmarkCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "icon" TEXT DEFAULT '📁',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookmarkCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "notes" TEXT,
    "rating" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "requestId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "outputCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "batchSize" INTEGER,
    "batchMode" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "httpStatusCode" INTEGER,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheHits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysisSession" (
    "id" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "subreddit" TEXT,
    "postsRequested" INTEGER NOT NULL DEFAULT 0,
    "postsProcessed" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageCostPerPost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalDuration" INTEGER,
    "averageDuration" INTEGER,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAnalysisSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPostAnalysis" (
    "id" TEXT NOT NULL,
    "redditPostId" TEXT NOT NULL,
    "postTitle" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "sessionId" TEXT,
    "analysisType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "inputCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "outputCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "isOpportunity" BOOLEAN NOT NULL DEFAULT false,
    "opportunityId" TEXT,
    "confidence" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "processingTime" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPostAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIDailyUsage" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "successfulRequests" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageCostPerRequest" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "postsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "averageCostPerPost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "costPerOpportunity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageResponseTime" INTEGER,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "modelUsage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelUsage" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "averageCostPerRequest" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "averageResponseTime" INTEGER,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "individualRequests" INTEGER NOT NULL DEFAULT 0,
    "batchRequests" INTEGER NOT NULL DEFAULT 0,
    "fallbackRequests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModelUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICostAlert" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailNotification" BOOLEAN NOT NULL DEFAULT true,
    "slackNotification" BOOLEAN NOT NULL DEFAULT false,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AICostAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICostOptimization" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "potentialSavings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "savingsPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "implementation" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "implementedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AICostOptimization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profileData" JSONB,
    "accountCreated" TIMESTAMP(3),
    "linkKarma" INTEGER DEFAULT 0,
    "commentKarma" INTEGER DEFAULT 0,
    "totalKarma" INTEGER DEFAULT 0,
    "lastScraped" TIMESTAMP(3),
    "postsScraped" INTEGER NOT NULL DEFAULT 0,
    "commentsScraped" INTEGER NOT NULL DEFAULT 0,
    "scrapingStatus" TEXT,
    "scrapingJobId" TEXT,
    "scrapingStarted" TIMESTAMP(3),
    "scrapingCompleted" TIMESTAMP(3),
    "scrapingError" TEXT,
    "analysisStatus" TEXT,
    "analysisJobId" TEXT,
    "analysisStarted" TIMESTAMP(3),
    "analysisCompleted" TIMESTAMP(3),
    "analysisError" TEXT,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedditUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditUserPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redditId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "permalink" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "numComments" INTEGER NOT NULL DEFAULT 0,
    "createdUtc" TIMESTAMP(3) NOT NULL,
    "isVideo" BOOLEAN NOT NULL DEFAULT false,
    "isImage" BOOLEAN NOT NULL DEFAULT false,
    "isLink" BOOLEAN NOT NULL DEFAULT false,
    "isSelf" BOOLEAN NOT NULL DEFAULT false,
    "over18" BOOLEAN NOT NULL DEFAULT false,
    "spoiler" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "stickied" BOOLEAN NOT NULL DEFAULT false,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisDate" TIMESTAMP(3),
    "isOpportunity" BOOLEAN,
    "opportunityId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedditUserPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedditUserComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redditId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "permalink" TEXT,
    "subreddit" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdUtc" TIMESTAMP(3) NOT NULL,
    "postId" TEXT,
    "postTitle" TEXT,
    "parentId" TEXT,
    "isTopLevel" BOOLEAN NOT NULL DEFAULT false,
    "isSubmitter" BOOLEAN NOT NULL DEFAULT false,
    "scoreHidden" BOOLEAN NOT NULL DEFAULT false,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisDate" TIMESTAMP(3),
    "isOpportunity" BOOLEAN,
    "opportunityId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedditUserComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserScrapingJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "scrapeType" TEXT NOT NULL,
    "limit" INTEGER,
    "timeframe" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "jobId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "postsScraped" INTEGER NOT NULL DEFAULT 0,
    "commentsScraped" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER,
    "currentPage" INTEGER NOT NULL DEFAULT 1,
    "newPosts" INTEGER NOT NULL DEFAULT 0,
    "newComments" INTEGER NOT NULL DEFAULT 0,
    "duplicatesSkipped" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserScrapingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubredditConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "scrapeFrequency" TEXT NOT NULL DEFAULT 'hourly',
    "maxPosts" INTEGER NOT NULL DEFAULT 25,
    "sortBy" TEXT NOT NULL DEFAULT 'hot',
    "description" TEXT,
    "category" TEXT,
    "totalPostsScraped" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "lastScraped" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubredditConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RedditPostComment_redditId_key" ON "RedditPostComment"("redditId");

-- CreateIndex
CREATE INDEX "RedditPostComment_postId_idx" ON "RedditPostComment"("postId");

-- CreateIndex
CREATE INDEX "RedditPostComment_subreddit_idx" ON "RedditPostComment"("subreddit");

-- CreateIndex
CREATE INDEX "RedditPostComment_author_idx" ON "RedditPostComment"("author");

-- CreateIndex
CREATE INDEX "RedditPostComment_createdUtc_idx" ON "RedditPostComment"("createdUtc");

-- CreateIndex
CREATE INDEX "RedditPostComment_score_idx" ON "RedditPostComment"("score");

-- CreateIndex
CREATE INDEX "RedditPostComment_analyzed_idx" ON "RedditPostComment"("analyzed");

-- CreateIndex
CREATE INDEX "RedditPostComment_isOpportunity_idx" ON "RedditPostComment"("isOpportunity");

-- CreateIndex
CREATE INDEX "RedditPostComment_parentId_idx" ON "RedditPostComment"("parentId");

-- CreateIndex
CREATE INDEX "BookmarkCollection_userId_idx" ON "BookmarkCollection"("userId");

-- CreateIndex
CREATE INDEX "BookmarkCollection_name_idx" ON "BookmarkCollection"("name");

-- CreateIndex
CREATE INDEX "BookmarkCollection_createdAt_idx" ON "BookmarkCollection"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkCollection_userId_name_key" ON "BookmarkCollection"("userId", "name");

-- CreateIndex
CREATE INDEX "OpportunityBookmark_userId_idx" ON "OpportunityBookmark"("userId");

-- CreateIndex
CREATE INDEX "OpportunityBookmark_opportunityId_idx" ON "OpportunityBookmark"("opportunityId");

-- CreateIndex
CREATE INDEX "OpportunityBookmark_collectionId_idx" ON "OpportunityBookmark"("collectionId");

-- CreateIndex
CREATE INDEX "OpportunityBookmark_createdAt_idx" ON "OpportunityBookmark"("createdAt");

-- CreateIndex
CREATE INDEX "OpportunityBookmark_position_idx" ON "OpportunityBookmark"("position");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityBookmark_userId_opportunityId_collectionId_key" ON "OpportunityBookmark"("userId", "opportunityId", "collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsageLog_requestId_key" ON "AIUsageLog"("requestId");

-- CreateIndex
CREATE INDEX "AIUsageLog_sessionId_idx" ON "AIUsageLog"("sessionId");

-- CreateIndex
CREATE INDEX "AIUsageLog_model_idx" ON "AIUsageLog"("model");

-- CreateIndex
CREATE INDEX "AIUsageLog_operation_idx" ON "AIUsageLog"("operation");

-- CreateIndex
CREATE INDEX "AIUsageLog_startTime_idx" ON "AIUsageLog"("startTime");

-- CreateIndex
CREATE INDEX "AIUsageLog_success_idx" ON "AIUsageLog"("success");

-- CreateIndex
CREATE INDEX "AIUsageLog_totalCost_idx" ON "AIUsageLog"("totalCost");

-- CreateIndex
CREATE INDEX "AIAnalysisSession_sessionType_idx" ON "AIAnalysisSession"("sessionType");

-- CreateIndex
CREATE INDEX "AIAnalysisSession_subreddit_idx" ON "AIAnalysisSession"("subreddit");

-- CreateIndex
CREATE INDEX "AIAnalysisSession_startTime_idx" ON "AIAnalysisSession"("startTime");

-- CreateIndex
CREATE INDEX "AIAnalysisSession_totalCost_idx" ON "AIAnalysisSession"("totalCost");

-- CreateIndex
CREATE INDEX "AIAnalysisSession_successRate_idx" ON "AIAnalysisSession"("successRate");

-- CreateIndex
CREATE INDEX "AIPostAnalysis_redditPostId_idx" ON "AIPostAnalysis"("redditPostId");

-- CreateIndex
CREATE INDEX "AIPostAnalysis_sessionId_idx" ON "AIPostAnalysis"("sessionId");

-- CreateIndex
CREATE INDEX "AIPostAnalysis_subreddit_idx" ON "AIPostAnalysis"("subreddit");

-- CreateIndex
CREATE INDEX "AIPostAnalysis_analysisType_idx" ON "AIPostAnalysis"("analysisType");

-- CreateIndex
CREATE INDEX "AIPostAnalysis_model_idx" ON "AIPostAnalysis"("model");

-- CreateIndex
CREATE INDEX "AIPostAnalysis_totalCost_idx" ON "AIPostAnalysis"("totalCost");

-- CreateIndex
CREATE INDEX "AIPostAnalysis_isOpportunity_idx" ON "AIPostAnalysis"("isOpportunity");

-- CreateIndex
CREATE INDEX "AIPostAnalysis_createdAt_idx" ON "AIPostAnalysis"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIPostAnalysis_redditPostId_sessionId_key" ON "AIPostAnalysis"("redditPostId", "sessionId");

-- CreateIndex
CREATE INDEX "AIDailyUsage_date_idx" ON "AIDailyUsage"("date");

-- CreateIndex
CREATE INDEX "AIDailyUsage_totalCost_idx" ON "AIDailyUsage"("totalCost");

-- CreateIndex
CREATE INDEX "AIDailyUsage_postsAnalyzed_idx" ON "AIDailyUsage"("postsAnalyzed");

-- CreateIndex
CREATE INDEX "AIDailyUsage_opportunitiesFound_idx" ON "AIDailyUsage"("opportunitiesFound");

-- CreateIndex
CREATE UNIQUE INDEX "AIDailyUsage_date_key" ON "AIDailyUsage"("date");

-- CreateIndex
CREATE INDEX "AIModelUsage_model_idx" ON "AIModelUsage"("model");

-- CreateIndex
CREATE INDEX "AIModelUsage_date_idx" ON "AIModelUsage"("date");

-- CreateIndex
CREATE INDEX "AIModelUsage_totalCost_idx" ON "AIModelUsage"("totalCost");

-- CreateIndex
CREATE INDEX "AIModelUsage_successRate_idx" ON "AIModelUsage"("successRate");

-- CreateIndex
CREATE UNIQUE INDEX "AIModelUsage_model_date_key" ON "AIModelUsage"("model", "date");

-- CreateIndex
CREATE INDEX "AICostAlert_alertType_idx" ON "AICostAlert"("alertType");

-- CreateIndex
CREATE INDEX "AICostAlert_isActive_idx" ON "AICostAlert"("isActive");

-- CreateIndex
CREATE INDEX "AICostAlert_threshold_idx" ON "AICostAlert"("threshold");

-- CreateIndex
CREATE INDEX "AICostOptimization_type_idx" ON "AICostOptimization"("type");

-- CreateIndex
CREATE INDEX "AICostOptimization_priority_idx" ON "AICostOptimization"("priority");

-- CreateIndex
CREATE INDEX "AICostOptimization_status_idx" ON "AICostOptimization"("status");

-- CreateIndex
CREATE INDEX "AICostOptimization_potentialSavings_idx" ON "AICostOptimization"("potentialSavings");

-- CreateIndex
CREATE UNIQUE INDEX "RedditUser_username_key" ON "RedditUser"("username");

-- CreateIndex
CREATE INDEX "RedditUser_username_idx" ON "RedditUser"("username");

-- CreateIndex
CREATE INDEX "RedditUser_scrapingStatus_idx" ON "RedditUser"("scrapingStatus");

-- CreateIndex
CREATE INDEX "RedditUser_analysisStatus_idx" ON "RedditUser"("analysisStatus");

-- CreateIndex
CREATE INDEX "RedditUser_lastScraped_idx" ON "RedditUser"("lastScraped");

-- CreateIndex
CREATE INDEX "RedditUser_totalKarma_idx" ON "RedditUser"("totalKarma");

-- CreateIndex
CREATE UNIQUE INDEX "RedditUserPost_redditId_key" ON "RedditUserPost"("redditId");

-- CreateIndex
CREATE INDEX "RedditUserPost_userId_idx" ON "RedditUserPost"("userId");

-- CreateIndex
CREATE INDEX "RedditUserPost_subreddit_idx" ON "RedditUserPost"("subreddit");

-- CreateIndex
CREATE INDEX "RedditUserPost_author_idx" ON "RedditUserPost"("author");

-- CreateIndex
CREATE INDEX "RedditUserPost_createdUtc_idx" ON "RedditUserPost"("createdUtc");

-- CreateIndex
CREATE INDEX "RedditUserPost_score_idx" ON "RedditUserPost"("score");

-- CreateIndex
CREATE INDEX "RedditUserPost_analyzed_idx" ON "RedditUserPost"("analyzed");

-- CreateIndex
CREATE INDEX "RedditUserPost_isOpportunity_idx" ON "RedditUserPost"("isOpportunity");

-- CreateIndex
CREATE UNIQUE INDEX "RedditUserComment_redditId_key" ON "RedditUserComment"("redditId");

-- CreateIndex
CREATE INDEX "RedditUserComment_userId_idx" ON "RedditUserComment"("userId");

-- CreateIndex
CREATE INDEX "RedditUserComment_subreddit_idx" ON "RedditUserComment"("subreddit");

-- CreateIndex
CREATE INDEX "RedditUserComment_author_idx" ON "RedditUserComment"("author");

-- CreateIndex
CREATE INDEX "RedditUserComment_createdUtc_idx" ON "RedditUserComment"("createdUtc");

-- CreateIndex
CREATE INDEX "RedditUserComment_score_idx" ON "RedditUserComment"("score");

-- CreateIndex
CREATE INDEX "RedditUserComment_analyzed_idx" ON "RedditUserComment"("analyzed");

-- CreateIndex
CREATE INDEX "RedditUserComment_isOpportunity_idx" ON "RedditUserComment"("isOpportunity");

-- CreateIndex
CREATE INDEX "RedditUserComment_postId_idx" ON "RedditUserComment"("postId");

-- CreateIndex
CREATE INDEX "UserScrapingJob_userId_idx" ON "UserScrapingJob"("userId");

-- CreateIndex
CREATE INDEX "UserScrapingJob_username_idx" ON "UserScrapingJob"("username");

-- CreateIndex
CREATE INDEX "UserScrapingJob_status_idx" ON "UserScrapingJob"("status");

-- CreateIndex
CREATE INDEX "UserScrapingJob_scrapeType_idx" ON "UserScrapingJob"("scrapeType");

-- CreateIndex
CREATE INDEX "UserScrapingJob_startedAt_idx" ON "UserScrapingJob"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubredditConfig_name_key" ON "SubredditConfig"("name");

-- CreateIndex
CREATE INDEX "SubredditConfig_isActive_idx" ON "SubredditConfig"("isActive");

-- CreateIndex
CREATE INDEX "SubredditConfig_priority_idx" ON "SubredditConfig"("priority");

-- CreateIndex
CREATE INDEX "SubredditConfig_scrapeFrequency_idx" ON "SubredditConfig"("scrapeFrequency");

-- CreateIndex
CREATE INDEX "SubredditConfig_lastScraped_idx" ON "SubredditConfig"("lastScraped");

-- CreateIndex
CREATE INDEX "RedditPost_sourceType_idx" ON "RedditPost"("sourceType");

-- CreateIndex
CREATE INDEX "RedditPost_sourceUserId_idx" ON "RedditPost"("sourceUserId");

-- AddForeignKey
ALTER TABLE "RedditPost" ADD CONSTRAINT "RedditPost_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "RedditUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditPostComment" ADD CONSTRAINT "RedditPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "RedditPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditPostComment" ADD CONSTRAINT "RedditPostComment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkCollection" ADD CONSTRAINT "BookmarkCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityBookmark" ADD CONSTRAINT "OpportunityBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityBookmark" ADD CONSTRAINT "OpportunityBookmark_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityBookmark" ADD CONSTRAINT "OpportunityBookmark_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "BookmarkCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIAnalysisSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPostAnalysis" ADD CONSTRAINT "AIPostAnalysis_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AIAnalysisSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPostAnalysis" ADD CONSTRAINT "AIPostAnalysis_redditPostId_fkey" FOREIGN KEY ("redditPostId") REFERENCES "RedditPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPostAnalysis" ADD CONSTRAINT "AIPostAnalysis_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditUserPost" ADD CONSTRAINT "RedditUserPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RedditUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditUserPost" ADD CONSTRAINT "RedditUserPost_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditUserComment" ADD CONSTRAINT "RedditUserComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RedditUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedditUserComment" ADD CONSTRAINT "RedditUserComment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
