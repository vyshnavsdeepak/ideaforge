-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "deltaComparison" JSONB,
ADD COLUMN     "makeshiftSolution" JSONB,
ADD COLUMN     "softwareSolution" JSONB;
