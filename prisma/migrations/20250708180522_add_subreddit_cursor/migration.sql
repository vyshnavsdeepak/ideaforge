-- CreateTable
CREATE TABLE "SubredditCursor" (
    "id" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "lastRedditId" TEXT NOT NULL,
    "lastCreatedUtc" TIMESTAMP(3) NOT NULL,
    "postsProcessed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubredditCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubredditCursor_subreddit_key" ON "SubredditCursor"("subreddit");

-- CreateIndex
CREATE INDEX "SubredditCursor_subreddit_idx" ON "SubredditCursor"("subreddit");
