import { prisma } from './prisma';
import { google } from '@ai-sdk/google';
import { embed } from 'ai';

export interface DemandSignal {
  id: string;
  text: string;
  niche: string;
  subreddit: string;
  postId: string;
  userId: string;
  timestamp: Date;
  engagement: number;
  type: 'post' | 'comment';
}

export interface ClusterMatch {
  clusterId: string;
  similarity: number;
  cluster: {
    niche: string;
    demandSignal: string;
    occurrenceCount: number;
  };
}

export class SemanticClusteringEngine {
  private readonly embeddingModel = google.textEmbeddingModel('text-embedding-004');
  private readonly similarityThreshold = 0.85; // High threshold for semantic similarity

  async processNewSignal(signal: DemandSignal): Promise<{
    isNewCluster: boolean;
    clusterId: string;
    similarity?: number;
  }> {
    try {
      // Generate embedding for the new signal
      const signalEmbedding = await this.generateEmbedding(signal.text);
      
      // Find similar existing clusters
      const similarCluster = await this.findSimilarCluster(
        signalEmbedding,
        signal.niche
      );

      if (similarCluster && similarCluster.similarity >= this.similarityThreshold) {
        // Update existing cluster
        await this.updateCluster(similarCluster.clusterId, signal);
        
        return {
          isNewCluster: false,
          clusterId: similarCluster.clusterId,
          similarity: similarCluster.similarity,
        };
      } else {
        // Create new cluster
        const newCluster = await this.createNewCluster(signal, signalEmbedding);
        
        return {
          isNewCluster: true,
          clusterId: newCluster.id,
        };
      }
    } catch (error) {
      console.error('Error processing demand signal:', error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.embeddingModel,
      value: text,
    });
    
    return embedding;
  }

  private async findSimilarCluster(
    embedding: number[],
    niche: string
  ): Promise<ClusterMatch | null> {
    // For now, we'll do a simple text comparison
    // In production, you'd want to use a vector database like Pinecone or Weaviate
    const existingClusters = await prisma.marketDemandCluster.findMany({
      where: { niche },
      orderBy: { occurrenceCount: 'desc' },
      take: 100, // Check top 100 clusters in the niche
    });

    let bestMatch: ClusterMatch | null = null;
    let highestSimilarity = 0;

    for (const cluster of existingClusters) {
      // Calculate cosine similarity with stored embedding
      const similarity = cluster.embedding 
        ? this.calculateCosineSimilarity(embedding, cluster.embedding as number[])
        : 0;

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          clusterId: cluster.id,
          similarity,
          cluster: {
            niche: cluster.niche,
            demandSignal: cluster.demandSignal,
            occurrenceCount: cluster.occurrenceCount,
          },
        };
      }
    }

    return bestMatch;
  }

  private calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    // Calculate cosine similarity between two embeddings
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

  private async updateCluster(clusterId: string, signal: DemandSignal) {
    const cluster = await prisma.marketDemandCluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster) return;

    // Update cluster with new signal
    await prisma.marketDemandCluster.update({
      where: { id: clusterId },
      data: {
        occurrenceCount: { increment: 1 },
        lastSeen: new Date(),
        subreddits: {
          set: Array.from(new Set([...cluster.subreddits, signal.subreddit])),
        },
      },
    });

    // Link opportunity if it exists
    if (signal.postId) {
      const opportunity = await prisma.opportunity.findFirst({
        where: {
          redditPosts: {
            some: {
              redditPostId: signal.postId
            }
          }
        },
      });

      if (opportunity) {
        await prisma.marketDemandOpportunity.upsert({
          where: {
            clusterId_opportunityId: {
              clusterId,
              opportunityId: opportunity.id,
            },
          },
          update: {},
          create: {
            clusterId,
            opportunityId: opportunity.id,
          },
        });
      }
    }
  }

  private async createNewCluster(signal: DemandSignal, embedding: number[]) {
    const cluster = await prisma.marketDemandCluster.create({
      data: {
        niche: signal.niche,
        demandSignal: signal.text,
        embedding: embedding,
        occurrenceCount: 1,
        subreddits: [signal.subreddit],
        lastSeen: new Date(),
      },
    });

    // Link opportunity if it exists
    if (signal.postId) {
      const opportunity = await prisma.opportunity.findFirst({
        where: {
          redditPosts: {
            some: {
              redditPostId: signal.postId
            }
          }
        },
      });

      if (opportunity) {
        await prisma.marketDemandOpportunity.create({
          data: {
            clusterId: cluster.id,
            opportunityId: opportunity.id,
          },
        });
      }
    }

    return cluster;
  }

  async extractDemandSignals(
    postTitle: string,
    postContent: string,
    subreddit: string,
    postId: string,
    userId: string,
    score: number
  ): Promise<DemandSignal[]> {
    const signals: DemandSignal[] = [];
    
    // Extract patterns that indicate demand
    const demandPatterns = [
      /how (?:do i|can i|to) (.+?)[\?\.]?$/i,
      /looking for (?:a )?(.+?)[\?\.]?$/i,
      /need (?:help with |a |an )?(.+?)[\?\.]?$/i,
      /anyone (?:know|found) (?:a |an )?(.+?)[\?\.]?$/i,
      /best way to (.+?)[\?\.]?$/i,
      /struggling with (.+?)[\?\.]?$/i,
      /is there (?:a |an )?(.+?)[\?\.]?$/i,
      /want(?:ing)? to (.+?)[\?\.]?$/i,
      /trying to (.+?)[\?\.]?$/i,
      /(?:i |we )?wish(?:ed)? (?:there was |i had |we had )?(.+?)[\?\.]?$/i,
    ];

    const fullText = `${postTitle} ${postContent}`.toLowerCase();
    const sentences = fullText.split(/[.!?]+/);

    for (const sentence of sentences) {
      for (const pattern of demandPatterns) {
        const match = sentence.match(pattern);
        if (match && match[1]) {
          const extractedNeed = match[1].trim();
          
          // Determine niche based on keywords and subreddit
          const niche = this.determineNiche(extractedNeed, subreddit);
          
          signals.push({
            id: `${postId}-${signals.length}`,
            text: extractedNeed,
            niche,
            subreddit,
            postId,
            userId,
            timestamp: new Date(),
            engagement: score,
            type: 'post',
          });
        }
      }
    }

    return signals;
  }

  private determineNiche(text: string, subreddit: string): string {
    // Niche determination logic based on keywords and subreddit
    const nicheMappings: Record<string, string[]> = {
      'AI prompt automation': ['prompt', 'chatgpt', 'automate', 'gpt', 'llm'],
      'Developer tools': ['debug', 'code', 'development', 'programming', 'git'],
      'Business automation': ['workflow', 'process', 'automate', 'efficiency'],
      'Content creation': ['content', 'write', 'blog', 'article', 'seo'],
      'Healthcare tech': ['patient', 'medical', 'health', 'doctor', 'appointment'],
      'Legal automation': ['legal', 'contract', 'lawyer', 'compliance', 'document'],
      'Education tools': ['learn', 'teach', 'course', 'student', 'education'],
      'Marketing tools': ['marketing', 'social', 'campaign', 'advertise', 'growth'],
      'Financial tools': ['finance', 'accounting', 'invoice', 'payment', 'budget'],
      'E-commerce': ['sell', 'shop', 'product', 'customer', 'order'],
    };

    const lowerText = text.toLowerCase();
    
    for (const [niche, keywords] of Object.entries(nicheMappings)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return niche;
      }
    }

    // Fallback to subreddit-based niche
    const subredditNiches: Record<string, string> = {
      'PromptEngineering': 'AI prompt automation',
      'programming': 'Developer tools',
      'entrepreneur': 'Business automation',
      'startups': 'Startup tools',
      'smallbusiness': 'Small business tools',
      'healthcare': 'Healthcare tech',
      'legaladvice': 'Legal automation',
      'webdev': 'Web development tools',
    };

    return subredditNiches[subreddit] || 'General automation';
  }

  async getTopDemandClusters(limit = 20): Promise<MarketDemandCluster[]> {
    return await prisma.marketDemandCluster.findMany({
      orderBy: { occurrenceCount: 'desc' },
      take: limit,
      include: {
        opportunities: {
          include: {
            opportunity: {
              select: {
                id: true,
                title: true,
                overallScore: true,
                viabilityThreshold: true,
              },
            },
          },
        },
      },
    });
  }

  async getDemandClustersByNiche(niche: string, limit = 10): Promise<MarketDemandCluster[]> {
    return await prisma.marketDemandCluster.findMany({
      where: { niche },
      orderBy: { occurrenceCount: 'desc' },
      take: limit,
      include: {
        opportunities: {
          include: {
            opportunity: {
              select: {
                id: true,
                title: true,
                overallScore: true,
                businessType: true,
              },
            },
          },
        },
      },
    });
  }

  async getTrendingDemandClusters(daysBack = 7): Promise<MarketDemandCluster[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    return await prisma.marketDemandCluster.findMany({
      where: {
        lastSeen: { gte: startDate },
      },
      orderBy: { occurrenceCount: 'desc' },
      take: 20,
    });
  }
}

export const clusteringEngine = new SemanticClusteringEngine();