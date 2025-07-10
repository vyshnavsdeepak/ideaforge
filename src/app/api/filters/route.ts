import { NextResponse } from 'next/server';
import { prisma } from '@/shared';

export async function GET() {
  try {
    // Get all opportunities to extract unique values
    const opportunities = await prisma.opportunity.findMany({
      select: {
        subreddit: true,
        niche: true,
        businessType: true,
        businessModel: true,
        revenueModel: true,
        pricingModel: true,
        platform: true,
        mobileSupport: true,
        deploymentType: true,
        developmentType: true,
        targetAudience: true,
        userType: true,
        technicalLevel: true,
        ageGroup: true,
        geography: true,
        marketType: true,
        economicLevel: true,
        industryVertical: true,
        developmentComplexity: true,
        teamSize: true,
        capitalRequirement: true,
        developmentTime: true,
        marketSizeCategory: true,
        competitionLevel: true,
        marketTrend: true,
        growthPotential: true,
        acquisitionStrategy: true,
        scalabilityType: true,
        overallScore: true,
      },
    });

    // Extract unique values for each field
    const getUniqueValues = (fieldName: keyof typeof opportunities[0]): string[] => {
      const values = new Set<string>();
      opportunities.forEach(opp => {
        const value = opp[fieldName];
        if (value && typeof value === 'string' && value !== '') {
          values.add(value);
        }
      });
      return Array.from(values).sort();
    };

    // Build filters object
    const filters = {
      // Source & Context
      subreddits: getUniqueValues('subreddit'),
      niches: getUniqueValues('niche'),
      
      // Business Type & Model
      businessTypes: getUniqueValues('businessType'),
      businessModels: getUniqueValues('businessModel'),
      revenueModels: getUniqueValues('revenueModel'),
      pricingModels: getUniqueValues('pricingModel'),
      
      // Technical & Platform
      platforms: getUniqueValues('platform'),
      mobileSupports: getUniqueValues('mobileSupport'),
      deploymentTypes: getUniqueValues('deploymentType'),
      developmentTypes: getUniqueValues('developmentType'),
      
      // Target Market
      targetAudiences: getUniqueValues('targetAudience'),
      userTypes: getUniqueValues('userType'),
      technicalLevels: getUniqueValues('technicalLevel'),
      ageGroups: getUniqueValues('ageGroup'),
      geographies: getUniqueValues('geography'),
      marketTypes: getUniqueValues('marketType'),
      economicLevels: getUniqueValues('economicLevel'),
      industryVerticals: getUniqueValues('industryVertical'),
      
      // Development & Resources
      developmentComplexities: getUniqueValues('developmentComplexity'),
      teamSizes: getUniqueValues('teamSize'),
      capitalRequirements: getUniqueValues('capitalRequirement'),
      developmentTimes: getUniqueValues('developmentTime'),
      
      // Market Analysis
      marketSizeCategories: getUniqueValues('marketSizeCategory'),
      competitionLevels: getUniqueValues('competitionLevel'),
      marketTrends: getUniqueValues('marketTrend'),
      growthPotentials: getUniqueValues('growthPotential'),
      acquisitionStrategies: getUniqueValues('acquisitionStrategy'),
      scalabilityTypes: getUniqueValues('scalabilityType'),
    };

    // Get score ranges
    const scores = opportunities.map(o => o.overallScore).filter((s): s is number => s !== null);
    const scoreRange = {
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 10,
    };

    return NextResponse.json({
      filters,
      scoreRange,
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}