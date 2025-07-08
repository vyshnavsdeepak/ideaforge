-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "RedditPost" (
    "id" TEXT NOT NULL,
    "redditId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "subreddit" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "numComments" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT,
    "permalink" TEXT,
    "createdUtc" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedditPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currentSolution" TEXT,
    "proposedSolution" TEXT NOT NULL,
    "marketContext" TEXT,
    "implementationNotes" TEXT,
    "speedScore" INTEGER NOT NULL DEFAULT 0,
    "convenienceScore" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "priceScore" INTEGER NOT NULL DEFAULT 0,
    "statusScore" INTEGER NOT NULL DEFAULT 0,
    "predictabilityScore" INTEGER NOT NULL DEFAULT 0,
    "uiUxScore" INTEGER NOT NULL DEFAULT 0,
    "easeOfUseScore" INTEGER NOT NULL DEFAULT 0,
    "legalFrictionScore" INTEGER NOT NULL DEFAULT 0,
    "emotionalComfortScore" INTEGER NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "viabilityThreshold" BOOLEAN NOT NULL DEFAULT false,
    "subreddit" TEXT NOT NULL,
    "marketSize" TEXT DEFAULT 'Unknown',
    "complexity" TEXT DEFAULT 'Medium',
    "successProbability" TEXT DEFAULT 'Medium',
    "businessType" TEXT DEFAULT 'Unknown',
    "businessModel" TEXT DEFAULT 'Unknown',
    "revenueModel" TEXT DEFAULT 'Unknown',
    "pricingModel" TEXT DEFAULT 'Unknown',
    "platform" TEXT DEFAULT 'Unknown',
    "mobileSupport" TEXT DEFAULT 'Unknown',
    "deploymentType" TEXT DEFAULT 'Unknown',
    "developmentType" TEXT DEFAULT 'Unknown',
    "targetAudience" TEXT DEFAULT 'Unknown',
    "userType" TEXT DEFAULT 'Unknown',
    "technicalLevel" TEXT DEFAULT 'Unknown',
    "ageGroup" TEXT DEFAULT 'Unknown',
    "geography" TEXT DEFAULT 'Unknown',
    "marketType" TEXT DEFAULT 'Unknown',
    "economicLevel" TEXT DEFAULT 'Unknown',
    "industryVertical" TEXT DEFAULT 'Unknown',
    "developmentComplexity" TEXT DEFAULT 'Unknown',
    "teamSize" TEXT DEFAULT 'Unknown',
    "capitalRequirement" TEXT DEFAULT 'Unknown',
    "developmentTime" TEXT DEFAULT 'Unknown',
    "marketSizeCategory" TEXT DEFAULT 'Unknown',
    "competitionLevel" TEXT DEFAULT 'Unknown',
    "marketTrend" TEXT DEFAULT 'Unknown',
    "growthPotential" TEXT DEFAULT 'Unknown',
    "acquisitionStrategy" TEXT DEFAULT 'Unknown',
    "scalabilityType" TEXT DEFAULT 'Unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "redditPostId" TEXT NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "RedditPost_redditId_key" ON "RedditPost"("redditId");

-- CreateIndex
CREATE INDEX "RedditPost_subreddit_idx" ON "RedditPost"("subreddit");

-- CreateIndex
CREATE INDEX "RedditPost_processedAt_idx" ON "RedditPost"("processedAt");

-- CreateIndex
CREATE INDEX "RedditPost_createdUtc_idx" ON "RedditPost"("createdUtc");

-- CreateIndex
CREATE INDEX "RedditPost_title_idx" ON "RedditPost"("title");

-- CreateIndex
CREATE INDEX "RedditPost_author_idx" ON "RedditPost"("author");

-- CreateIndex
CREATE INDEX "RedditPost_title_author_idx" ON "RedditPost"("title", "author");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_redditPostId_key" ON "Opportunity"("redditPostId");

-- CreateIndex
CREATE INDEX "Opportunity_subreddit_idx" ON "Opportunity"("subreddit");

-- CreateIndex
CREATE INDEX "Opportunity_overallScore_idx" ON "Opportunity"("overallScore");

-- CreateIndex
CREATE INDEX "Opportunity_viabilityThreshold_idx" ON "Opportunity"("viabilityThreshold");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "Opportunity_title_idx" ON "Opportunity"("title");

-- CreateIndex
CREATE INDEX "Opportunity_description_idx" ON "Opportunity"("description");

-- CreateIndex
CREATE INDEX "Opportunity_proposedSolution_idx" ON "Opportunity"("proposedSolution");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavorite_userId_opportunityId_key" ON "UserFavorite"("userId", "opportunityId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_redditPostId_fkey" FOREIGN KEY ("redditPostId") REFERENCES "RedditPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
