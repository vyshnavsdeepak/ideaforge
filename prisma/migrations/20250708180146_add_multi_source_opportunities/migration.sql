/*
  Warnings:

  - You are about to drop the column `redditPostId` on the `Opportunity` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_redditPostId_fkey";

-- DropIndex
DROP INDEX "Opportunity_redditPostId_key";

-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN "redditPostId",
ADD COLUMN     "sourceCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "OpportunitySource" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "redditPostId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'post',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunitySource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunitySource_opportunityId_idx" ON "OpportunitySource"("opportunityId");

-- CreateIndex
CREATE INDEX "OpportunitySource_redditPostId_idx" ON "OpportunitySource"("redditPostId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySource_opportunityId_redditPostId_key" ON "OpportunitySource"("opportunityId", "redditPostId");

-- AddForeignKey
ALTER TABLE "OpportunitySource" ADD CONSTRAINT "OpportunitySource_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySource" ADD CONSTRAINT "OpportunitySource_redditPostId_fkey" FOREIGN KEY ("redditPostId") REFERENCES "RedditPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
