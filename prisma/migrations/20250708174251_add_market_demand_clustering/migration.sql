-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "niche" TEXT DEFAULT 'Unknown';

-- CreateTable
CREATE TABLE "MarketDemandCluster" (
    "id" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "demandSignal" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "subreddits" TEXT[],
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketDemandCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketDemandOpportunity" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketDemandOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketDemandCluster_niche_idx" ON "MarketDemandCluster"("niche");

-- CreateIndex
CREATE INDEX "MarketDemandCluster_occurrenceCount_idx" ON "MarketDemandCluster"("occurrenceCount");

-- CreateIndex
CREATE INDEX "MarketDemandCluster_lastSeen_idx" ON "MarketDemandCluster"("lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "MarketDemandCluster_niche_demandSignal_key" ON "MarketDemandCluster"("niche", "demandSignal");

-- CreateIndex
CREATE UNIQUE INDEX "MarketDemandOpportunity_clusterId_opportunityId_key" ON "MarketDemandOpportunity"("clusterId", "opportunityId");

-- CreateIndex
CREATE INDEX "Opportunity_businessType_idx" ON "Opportunity"("businessType");

-- CreateIndex
CREATE INDEX "Opportunity_industryVertical_idx" ON "Opportunity"("industryVertical");

-- CreateIndex
CREATE INDEX "Opportunity_niche_idx" ON "Opportunity"("niche");

-- AddForeignKey
ALTER TABLE "MarketDemandOpportunity" ADD CONSTRAINT "MarketDemandOpportunity_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "MarketDemandCluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketDemandOpportunity" ADD CONSTRAINT "MarketDemandOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
