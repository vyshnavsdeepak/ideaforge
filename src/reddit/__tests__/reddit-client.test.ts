import { RedditClient } from '../services/reddit-client'

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock environment variables for OAuth
process.env.REDDIT_CLIENT_ID = 'test_client_id'
process.env.REDDIT_CLIENT_SECRET = 'test_client_secret'
process.env.REDDIT_USERNAME = 'test_user'
process.env.REDDIT_PASSWORD = 'test_pass'

describe('Reddit Client', () => {
  let client: RedditClient

  beforeEach(() => {
    client = new RedditClient()
    jest.clearAllMocks()
  })

  describe('fetchSubredditPosts', () => {
    test('processes permalinks correctly (prevents URL concatenation bug)', async () => {
      const mockRedditResponse = {
        data: {
          children: [
            {
              kind: 't3',
              data: {
                id: 'test123',
                title: 'Test Post',
                selftext: 'Test content',
                subreddit: 'test',
                author: 'testuser',
                score: 100,
                ups: 90,
                downs: 10,
                num_comments: 5,
                url: 'https://reddit.com/r/test/comments/test123',
                permalink: '/r/test/comments/test123/test_post/',
                created_utc: 1640995200,
                over_18: false,
                stickied: false,
                locked: false,
                is_self: true,
              }
            }
          ]
        }
      }

      // Mock OAuth token first, then the API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)

      const posts = await client.fetchSubredditPosts('test')

      expect(posts).toHaveLength(1)
      const post = posts[0]
      
      // Critical test: permalink should be stored as-is from Reddit API
      expect(post.permalink).toBe('/r/test/comments/test123/test_post/')
      
      // Should NOT be concatenated with https://reddit.com at this stage
      expect(post.permalink).not.toBe('https://reddit.com/r/test/comments/test123/test_post/')
      
      // Other fields should be processed correctly
      expect(post.redditId).toBe('test123')
      expect(post.title).toBe('Test Post')
      expect(post.content).toBe('Test content')
      expect(post.subreddit).toBe('test')
      expect(post.author).toBe('testuser')
      expect(post.score).toBe(100)
      expect(post.upvotes).toBe(90)
      expect(post.downvotes).toBe(10)
      expect(post.numComments).toBe(5)
    })

    test('handles API errors gracefully', async () => {
      // Mock OAuth token success, then API error
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)

      await expect(client.fetchSubredditPosts('nonexistent'))
        .rejects.toThrow('Subreddit r/nonexistent not found or may be private')
    })

    test('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.fetchSubredditPosts('test'))
        .rejects.toThrow('Network error accessing r/test: Network error')
    })

    test('filters out low-quality posts', async () => {
      const mockRedditResponse = {
        data: {
          children: [
            {
              kind: 't3',
              data: {
                id: 'good_post',
                title: 'Good Post',
                selftext: 'Good content',
                subreddit: 'test',
                author: 'gooduser',
                score: 100,
                ups: 90,
                downs: 10,
                num_comments: 25,
                url: 'https://reddit.com/r/test/comments/good_post',
                permalink: '/r/test/comments/good_post/good_post/',
                created_utc: 1640995200,
                over_18: false,
                stickied: false,
                locked: false,
                is_self: true,
              }
            },
            {
              kind: 't3',
              data: {
                id: 'low_score_post',
                title: 'Low Score Post',
                selftext: 'Low score content',
                subreddit: 'test',
                author: 'lowuser',
                score: 2, // Below threshold
                ups: 2,
                downs: 0,
                num_comments: 1, // Below threshold
                url: 'https://reddit.com/r/test/comments/low_score_post',
                permalink: '/r/test/comments/low_score_post/low_score_post/',
                created_utc: 1640995200,
                over_18: false,
                stickied: false,
                locked: false,
                is_self: true,
              }
            },
            {
              kind: 't3',
              data: {
                id: 'stickied_post',
                title: 'Stickied Post',
                selftext: 'Stickied content',
                subreddit: 'test',
                author: 'stickyuser',
                score: 100,
                ups: 90,
                downs: 10,
                num_comments: 25,
                url: 'https://reddit.com/r/test/comments/stickied_post',
                permalink: '/r/test/comments/stickied_post/stickied_post/',
                created_utc: 1640995200,
                over_18: false,
                stickied: true, // Should be filtered out
                locked: false,
                is_self: true,
              }
            }
          ]
        }
      }

      // Mock OAuth token first, then the API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)

      const posts = await client.fetchSubredditPosts('test')

      // Only the good post should remain
      expect(posts).toHaveLength(1)
      expect(posts[0].redditId).toBe('good_post')
    })

    test('filters out noise posts', async () => {
      const mockRedditResponse = {
        data: {
          children: [
            {
              kind: 't3',
              data: {
                id: 'noise_post',
                title: 'Weekly Thread: Ask Questions Here',
                selftext: 'This is a weekly thread',
                subreddit: 'test',
                author: 'moderator',
                score: 100,
                ups: 90,
                downs: 10,
                num_comments: 25,
                url: 'https://reddit.com/r/test/comments/noise_post',
                permalink: '/r/test/comments/noise_post/weekly_thread/',
                created_utc: 1640995200,
                over_18: false,
                stickied: false,
                locked: false,
                is_self: true,
              }
            }
          ]
        }
      }

      // Mock OAuth token first, then the API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)

      const posts = await client.fetchSubredditPosts('test')

      // Should filter out the weekly thread
      expect(posts).toHaveLength(0)
    })

    test('handles different sorting options', async () => {
      const mockRedditResponse = {
        data: {
          children: []
        }
      }

      // Mock sequence: OAuth token, then 3 API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)

      // Test different sort options - now using OAuth endpoints
      await client.fetchSubredditPosts('test', 'hot', 25)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth.reddit.com/r/test/hot?limit=25',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token'
          })
        })
      )

      await client.fetchSubredditPosts('test', 'new', 10)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth.reddit.com/r/test/new?limit=10',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token'
          })
        })
      )

      await client.fetchSubredditPosts('test', 'top', 50)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth.reddit.com/r/test/top?limit=50',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token'
          })
        })
      )
    })

    test('handles empty API response', async () => {
      const mockRedditResponse = {
        data: {
          children: []
        }
      }

      // Mock OAuth token first, then the API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)

      const posts = await client.fetchSubredditPosts('test')

      expect(posts).toHaveLength(0)
    })

    test('handles posts with missing selftext', async () => {
      const mockRedditResponse = {
        data: {
          children: [
            {
              kind: 't3',
              data: {
                id: 'link_post',
                title: 'Link Post',
                selftext: '', // Empty selftext for link posts
                subreddit: 'test',
                author: 'linkuser',
                score: 100,
                ups: 90,
                downs: 10,
                num_comments: 25,
                url: 'https://example.com',
                permalink: '/r/test/comments/link_post/link_post/',
                created_utc: 1640995200,
                over_18: false,
                stickied: false,
                locked: false,
                is_self: false,
              }
            }
          ]
        }
      }

      // Mock OAuth token first, then the API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)

      const posts = await client.fetchSubredditPosts('test')

      expect(posts).toHaveLength(1)
      expect(posts[0].content).toBe('') // Should handle empty selftext
    })
  })

  describe('User-Agent header', () => {
    test('includes proper User-Agent header', async () => {
      const mockRedditResponse = {
        data: {
          children: []
        }
      }

      // Mock OAuth token first, then the API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', expires_in: 3600 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
        } as Response)

      await client.fetchSubredditPosts('test')

      // Check that the OAuth request has the correct User-Agent
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.reddit.com/api/v1/access_token',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringMatching(/^web:IdeaForge:v2\.0\.0 \(by \/u\/.*\)$/),
          }),
        })
      )

      // Check that the API request has the correct User-Agent and Authorization
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth.reddit.com/r/test/hot?limit=25',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringMatching(/^web:IdeaForge:v2\.0\.0 \(by \/u\/.*\)$/),
            'Authorization': 'Bearer test_token',
          }),
        })
      )
    })
  })
})