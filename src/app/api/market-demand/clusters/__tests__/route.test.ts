import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the clustering engine
jest.mock('@/lib/semantic-clustering', () => ({
  clusteringEngine: {
    getTopDemandClusters: jest.fn().mockResolvedValue([
      {
        id: 'cluster-1',
        niche: 'AI prompt automation',
        demandSignal: 'automate chatgpt responses',
        occurrenceCount: 15,
        subreddits: ['PromptEngineering', 'ChatGPT'],
        lastSeen: new Date('2024-01-15'),
      },
    ]),
    getTrendingDemandClusters: jest.fn().mockResolvedValue([
      {
        id: 'cluster-2',
        niche: 'Developer tools',
        demandSignal: 'debug react components',
        occurrenceCount: 25,
        subreddits: ['webdev', 'reactjs'],
        lastSeen: new Date('2024-01-18'),
      },
    ]),
    getDemandClustersByNiche: jest.fn().mockResolvedValue([
      {
        id: 'cluster-3',
        niche: 'Healthcare tech',
        demandSignal: 'patient appointment scheduling',
        occurrenceCount: 10,
        subreddits: ['healthcare', 'medicine'],
        lastSeen: new Date('2024-01-10'),
      },
    ]),
  },
}));

describe('/api/market-demand/clusters', () => {
  describe('GET', () => {
    test('should handle request with trending=true parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/market-demand/clusters?limit=30&trending=true');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.clusters).toHaveLength(1);
      expect(data.clusters[0].niche).toBe('Developer tools');
    });

    test('should handle request without niche parameter (null case)', async () => {
      const request = new NextRequest('http://localhost:3000/api/market-demand/clusters?limit=20');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.clusters).toHaveLength(1);
      expect(data.clusters[0].niche).toBe('AI prompt automation');
    });

    test('should handle request with niche parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/market-demand/clusters?niche=Healthcare%20tech');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.clusters).toHaveLength(1);
      expect(data.clusters[0].niche).toBe('Healthcare tech');
    });

    test('should calculate market strength correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/market-demand/clusters');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.clusters[0].marketStrength).toBeDefined();
      expect(data.clusters[0].marketStrength).toBeGreaterThanOrEqual(0);
      expect(data.clusters[0].marketStrength).toBeLessThanOrEqual(100);
    });
  });
});