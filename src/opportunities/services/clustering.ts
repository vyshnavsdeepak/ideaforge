import { prisma } from '@/shared';
import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import { clusteringEngine } from './semantic-clustering';
import type { Opportunity } from '@prisma/client';

interface OpportunityCluster {
  id: string;
  title: string;
  description: string;
  similarityScore: number;
  sourceCount: number;
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    overallScore: number;
    viabilityThreshold: boolean;
    subreddit: string;
    sourceCount: number;
    createdAt: Date;
    redditPosts: Array<{
      redditPost: {
        id: string;
        title: string;
        author: string;
        score: number;
        subreddit: string;
        createdUtc: Date;
      };
    }>;
  }>;
  subreddits: string[];
  avgScore: number;
  totalViability: number;
  firstSeen: Date;
  lastSeen: Date;
  trendingScore: number;
}

export class OpportunityClusteringEngine {
  private readonly embeddingModel = google.textEmbeddingModel('text-embedding-004');
  private readonly similarityThreshold = 0.80; // Lower threshold for opportunity clustering

  async clusterSimilarOpportunities(): Promise<OpportunityCluster[]> {
    try {
      // Get all opportunities with their sources
      const opportunities = await prisma.opportunity.findMany({
        include: {
          redditPosts: {
            include: {
              redditPost: {
                select: {
                  id: true,
                  title: true,
                  author: true,
                  score: true,
                  subreddit: true,
                  createdUtc: true,
                },
              },
            },
          },
        },
        orderBy: { overallScore: 'desc' },
      });

      // Group opportunities by semantic similarity
      const clusters = await this.groupOpportunitiesBySemanticSimilarity(opportunities);

      // Calculate trending scores and enhance clusters
      const enhancedClusters = await this.enhanceClusterData(clusters);

      // Update market demand clusters with these insights
      await this.updateMarketDemandClusters(enhancedClusters);

      return enhancedClusters;
    } catch (error) {
      console.error('Error clustering opportunities:', error);
      throw error;
    }
  }

  private async groupOpportunitiesBySemanticSimilarity(
    opportunities: Array<Opportunity & {
      redditPosts: Array<{
        redditPost: {
          id: string;
          title: string;
          author: string;
          score: number;
          subreddit: string;
          createdUtc: Date;
        };
      }>;
    }>
  ): Promise<Map<string, typeof opportunities>> {
    const clustersMap = new Map<string, typeof opportunities>();
    const processedOpportunities = new Set<string>();

    for (const opportunity of opportunities) {
      if (processedOpportunities.has(opportunity.id)) continue;

      // Generate embedding for this opportunity
      const opportunityText = `${opportunity.title} ${opportunity.description} ${opportunity.proposedSolution}`;
      const embedding = await this.generateEmbedding(opportunityText);

      // Find similar opportunities
      const similarOpportunities = [opportunity];
      processedOpportunities.add(opportunity.id);

      for (const otherOpportunity of opportunities) {
        if (processedOpportunities.has(otherOpportunity.id)) continue;

        const otherText = `${otherOpportunity.title} ${otherOpportunity.description} ${otherOpportunity.proposedSolution}`;
        const otherEmbedding = await this.generateEmbedding(otherText);

        const similarity = this.calculateCosineSimilarity(embedding, otherEmbedding);

        if (similarity >= this.similarityThreshold) {
          similarOpportunities.push(otherOpportunity);
          processedOpportunities.add(otherOpportunity.id);
        }
      }

      // Only create cluster if we have multiple similar opportunities
      if (similarOpportunities.length >= 2) {
        const clusterId = `cluster_${opportunity.id}`;
        clustersMap.set(clusterId, similarOpportunities);
      }
    }

    return clustersMap;
  }

  private async enhanceClusterData(
    clustersMap: Map<string, Array<Opportunity & {
      redditPosts: Array<{
        redditPost: {
          id: string;
          title: string;
          author: string;
          score: number;
          subreddit: string;
          createdUtc: Date;
        };
      }>;
    }>>
  ): Promise<OpportunityCluster[]> {
    const enhancedClusters: OpportunityCluster[] = [];

    for (const [clusterId, opportunities] of clustersMap) {
      // Calculate cluster metrics
      const totalSourceCount = opportunities.reduce((sum, opp) => sum + opp.sourceCount, 0);
      const avgScore = opportunities.reduce((sum, opp) => sum + opp.overallScore, 0) / opportunities.length;
      const totalViability = opportunities.filter(opp => opp.viabilityThreshold).length;
      const subreddits = [...new Set(opportunities.flatMap(opp => 
        opp.redditPosts.map(post => post.redditPost.subreddit)
      ))];
      
      const allDates = opportunities.flatMap(opp => [
        opp.createdAt,
        ...opp.redditPosts.map(post => post.redditPost.createdUtc)
      ]);
      const firstSeen = new Date(Math.min(...allDates.map(d => d.getTime())));
      const lastSeen = new Date(Math.max(...allDates.map(d => d.getTime())));

      // Calculate trending score based on recent activity and engagement
      const trendingScore = this.calculateTrendingScore(opportunities, firstSeen, lastSeen);

      // Generate representative title and description
      const representativeTitle = this.generateRepresentativeTitle(opportunities);
      const representativeDescription = this.generateRepresentativeDescription(opportunities);

      enhancedClusters.push({
        id: clusterId,
        title: representativeTitle,
        description: representativeDescription,
        similarityScore: avgScore,
        sourceCount: totalSourceCount,
        opportunities: opportunities.map(opp => ({
          id: opp.id,
          title: opp.title,
          description: opp.description,
          overallScore: opp.overallScore,
          viabilityThreshold: opp.viabilityThreshold,
          subreddit: opp.subreddit,
          sourceCount: opp.sourceCount,
          createdAt: opp.createdAt,
          redditPosts: opp.redditPosts,
        })),
        subreddits,
        avgScore,
        totalViability,
        firstSeen,
        lastSeen,
        trendingScore,
      });
    }

    // Sort by trending score and source count
    return enhancedClusters.sort((a, b) => 
      (b.trendingScore * 0.6 + b.sourceCount * 0.4) - (a.trendingScore * 0.6 + a.sourceCount * 0.4)
    );
  }

  private calculateTrendingScore(
    opportunities: Array<Opportunity & {
      redditPosts: Array<{
        redditPost: {
          id: string;
          title: string;
          author: string;
          score: number;
          subreddit: string;
          createdUtc: Date;
        };
      }>;
    }>,
    firstSeen: Date,
    lastSeen: Date
  ): number {
    const now = new Date();
    const daysSinceFirst = (now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceLast = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);

    // Calculate recency score (higher if more recent)
    const recencyScore = daysSinceLast < 1 ? 1 : 
                        daysSinceLast < 7 ? 0.8 :
                        daysSinceLast < 30 ? 0.5 : 0.2;

    // Calculate velocity (how quickly it's gaining traction)
    const totalEngagement = opportunities.reduce((sum, opp) => 
      sum + opp.redditPosts.reduce((postSum, post) => postSum + post.redditPost.score, 0), 0
    );
    const velocityScore = Math.min(totalEngagement / Math.max(daysSinceFirst, 1) / 100, 1);

    // Calculate cross-subreddit factor
    const subredditCount = new Set(opportunities.flatMap(opp => 
      opp.redditPosts.map(post => post.redditPost.subreddit)
    )).size;
    const crossSubredditScore = Math.min(subredditCount / 5, 1);

    // Calculate source diversity
    const sourceCount = opportunities.reduce((sum, opp) => sum + opp.sourceCount, 0);
    const sourceScore = Math.min(sourceCount / 10, 1);

    // Weighted combination
    return (
      recencyScore * 0.3 +
      velocityScore * 0.3 +
      crossSubredditScore * 0.2 +
      sourceScore * 0.2
    ) * 100;
  }

  private generateRepresentativeTitle(opportunities: Array<Opportunity>): string {
    // Find the most common words in titles
    const titleWords = opportunities.flatMap(opp => 
      opp.title.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    );
    
    const wordFreq = titleWords.reduce((freq, word) => {
      freq[word] = (freq[word] || 0) + 1;
      return freq;
    }, {} as Record<string, number>);

    const commonWords = Object.entries(wordFreq)
      .filter(([, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);

    if (commonWords.length > 0) {
      return `${commonWords.join(' ')} solutions (${opportunities.length} similar opportunities)`;
    }

    return `Similar opportunities: ${opportunities[0].title} (${opportunities.length} variations)`;
  }

  private generateRepresentativeDescription(opportunities: Array<Opportunity>): string {
    const bestOpportunity = opportunities.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    );

    const uniqueElements = new Set();
    opportunities.forEach(opp => {
      opp.description.split('.').forEach(sentence => {
        if (sentence.trim().length > 20) {
          uniqueElements.add(sentence.trim());
        }
      });
    });

    const representativeElements = Array.from(uniqueElements).slice(0, 3);
    
    return `This cluster represents ${opportunities.length} similar opportunities focusing on ${bestOpportunity.niche || 'automation solutions'}. Common themes: ${representativeElements.join('. ')}.`;
  }

  async getTopRequestedIdeas(limit = 20): Promise<{
    clusters: OpportunityCluster[];
    summary: {
      totalClusters: number;
      totalOpportunities: number;
      avgClusterSize: number;
      topNiches: Array<{ niche: string; count: number; avgScore: number }>;
      crossSubredditClusters: number;
      highViabilityClusters: number;
    };
  }> {
    const clusters = await this.clusterSimilarOpportunities();
    
    // Filter to top requested (by source count and trending score)
    const topClusters = clusters
      .filter(cluster => cluster.sourceCount >= 3) // At least 3 sources
      .slice(0, limit);

    // Calculate summary statistics
    const totalOpportunities = clusters.reduce((sum, cluster) => sum + cluster.opportunities.length, 0);
    const avgClusterSize = totalOpportunities / clusters.length;
    
    // Calculate niche distribution
    const nicheStats = new Map<string, { count: number; totalScore: number }>();
    clusters.forEach(cluster => {
      cluster.opportunities.forEach(opp => {
        const niche = opp.subreddit; // Using subreddit as niche proxy
        if (!nicheStats.has(niche)) {
          nicheStats.set(niche, { count: 0, totalScore: 0 });
        }
        const stats = nicheStats.get(niche)!;
        stats.count++;
        stats.totalScore += opp.overallScore;
      });
    });

    const topNiches = Array.from(nicheStats.entries())
      .map(([niche, stats]) => ({
        niche,
        count: stats.count,
        avgScore: stats.totalScore / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const crossSubredditClusters = clusters.filter(cluster => cluster.subreddits.length > 1).length;
    const highViabilityClusters = clusters.filter(cluster => cluster.totalViability / cluster.opportunities.length > 0.5).length;

    return {
      clusters: topClusters,
      summary: {
        totalClusters: clusters.length,
        totalOpportunities,
        avgClusterSize,
        topNiches,
        crossSubredditClusters,
        highViabilityClusters,
      },
    };
  }

  private async updateMarketDemandClusters(clusters: OpportunityCluster[]): Promise<void> {
    // Update market demand clusters with opportunity clustering insights
    for (const cluster of clusters) {
      const niche = cluster.opportunities[0]?.subreddit || 'General';
      
      // Extract demand signals from the cluster
      const signals = await clusteringEngine.extractDemandSignals(
        cluster.title,
        cluster.description,
        niche,
        cluster.opportunities[0]?.id || '',
        'system',
        cluster.sourceCount
      );

      // Process each signal
      for (const signal of signals) {
        await clusteringEngine.processNewSignal(signal);
      }
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.embeddingModel,
      value: text,
    });
    
    return embedding;
  }

  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (norm1 * norm2);
  }
}

export const opportunityClusteringEngine = new OpportunityClusteringEngine();