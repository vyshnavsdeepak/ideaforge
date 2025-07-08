import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

type FilterField = keyof Omit<typeof prisma.opportunity.fields, 'id' | 'createdAt' | 'updatedAt'>;

async function getUniqueValues(field: FilterField) {
  const values = await prisma.opportunity.findMany({
    select: { [field]: true },
    distinct: [field],
    where: {
      [field]: {
        not: null,
      },
    },
  });
  
  return values
    .map((v) => v[field])
    .filter((value): value is string => value !== null && value !== '');
}

export async function GET() {
  try {
    // Fetch all unique filter values from the database in parallel
    const [
      subreddits,
      businessTypes,
      businessModels,
      revenueModels,
      pricingModels,
      platforms,
      mobileSupports,
      deploymentTypes,
      developmentTypes,
      targetAudiences,
      userTypes,
      technicalLevels,
      ageGroups,
      geographies,
      marketTypes,
      economicLevels,
      industryVerticals,
      niches,
      developmentComplexities,
      teamSizes,
      capitalRequirements,
      developmentTimes,
      marketSizeCategories,
      competitionLevels,
      marketTrends,
      growthPotentials,
      acquisitionStrategies,
      scalabilityTypes,
    ] = await Promise.all([
      getUniqueValues('subreddit'),
      getUniqueValues('businessType'),
      getUniqueValues('businessModel'),
      getUniqueValues('revenueModel'),
      getUniqueValues('pricingModel'),
      getUniqueValues('platform'),
      getUniqueValues('mobileSupport'),
      getUniqueValues('deploymentType'),
      getUniqueValues('developmentType'),
      getUniqueValues('targetAudience'),
      getUniqueValues('userType'),
      getUniqueValues('technicalLevel'),
      getUniqueValues('ageGroup'),
      getUniqueValues('geography'),
      getUniqueValues('marketType'),
      getUniqueValues('economicLevel'),
      getUniqueValues('industryVertical'),
      getUniqueValues('niche'),
      getUniqueValues('developmentComplexity'),
      getUniqueValues('teamSize'),
      getUniqueValues('capitalRequirement'),
      getUniqueValues('developmentTime'),
      getUniqueValues('marketSizeCategory'),
      getUniqueValues('competitionLevel'),
      getUniqueValues('marketTrend'),
      getUniqueValues('growthPotential'),
      getUniqueValues('acquisitionStrategy'),
      getUniqueValues('scalabilityType'),
    ]);

    // Transform the data into a structured format
    const filters = {
      // Source & Context
      subreddits,
      niches,
      
      // Business Type & Model
      businessTypes,
      businessModels,
      revenueModels,
      pricingModels,
      
      // Technical & Platform
      platforms,
      mobileSupports,
      deploymentTypes,
      developmentTypes,
      
      // Target Market
      targetAudiences,
      userTypes,
      technicalLevels,
      ageGroups,
      geographies,
      marketTypes,
      economicLevels,
      industryVerticals,
      
      // Development & Resources
      developmentComplexities,
      teamSizes,
      capitalRequirements,
      developmentTimes,
      
      // Market Analysis
      marketSizeCategories,
      competitionLevels,
      marketTrends,
      growthPotentials,
      acquisitionStrategies,
      scalabilityTypes,
    };

    // Get score ranges
    const scoreStats = await prisma.opportunity.aggregate({
      _min: {
        overallScore: true,
      },
      _max: {
        overallScore: true,
      },
    });

    return NextResponse.json({
      filters,
      scoreRange: {
        min: scoreStats._min.overallScore || 0,
        max: scoreStats._max.overallScore || 10,
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}