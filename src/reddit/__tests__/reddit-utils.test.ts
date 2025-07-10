import {
  formatRedditUrl,
  cleanRedditUrl,
  isValidRedditPermalink,
  extractSubredditFromPermalink,
  extractPostIdFromPermalink,
} from '../utils/reddit-utils'

describe('Reddit URL Utilities', () => {
  describe('formatRedditUrl', () => {
    test('handles null and undefined inputs', () => {
      expect(formatRedditUrl(null)).toBeNull()
      expect(formatRedditUrl(undefined)).toBeNull()
      expect(formatRedditUrl('')).toBeNull()
    })

    test('handles full URLs correctly', () => {
      const fullUrl = 'https://reddit.com/r/startups/comments/1234/test'
      expect(formatRedditUrl(fullUrl)).toBe(fullUrl)
      
      const httpUrl = 'http://reddit.com/r/startups/comments/1234/test'
      expect(formatRedditUrl(httpUrl)).toBe(httpUrl)
    })

    test('handles relative paths correctly', () => {
      const relativePath = '/r/startups/comments/1234/test'
      expect(formatRedditUrl(relativePath)).toBe('https://reddit.com/r/startups/comments/1234/test')
    })

    test('handles paths without leading slash', () => {
      const pathWithoutSlash = 'r/startups/comments/1234/test'
      expect(formatRedditUrl(pathWithoutSlash)).toBe('https://reddit.com/r/startups/comments/1234/test')
    })

    test('prevents double concatenation (the bug we fixed)', () => {
      const alreadyFormatted = 'https://reddit.com/r/startups/comments/1234/test'
      expect(formatRedditUrl(alreadyFormatted)).toBe(alreadyFormatted)
      
      // This should NOT result in double concatenation
      expect(formatRedditUrl(alreadyFormatted)).not.toBe('https://reddit.com' + alreadyFormatted)
    })
  })

  describe('cleanRedditUrl', () => {
    test('handles empty inputs', () => {
      expect(cleanRedditUrl('')).toBe('')
      expect(cleanRedditUrl(null as unknown as string)).toBe('')
      expect(cleanRedditUrl(undefined as unknown as string)).toBe('')
    })

    test('removes duplicate protocols', () => {
      const malformedUrl = 'https://https://reddit.com/r/test'
      expect(cleanRedditUrl(malformedUrl)).toBe('https://reddit.com/r/test')
      
      const mixedProtocols = 'http://https://reddit.com/r/test'
      expect(cleanRedditUrl(mixedProtocols)).toBe('https://reddit.com/r/test')
    })

    test('removes duplicate reddit.com', () => {
      const duplicateReddit = 'https://reddit.com/reddit.com/r/test'
      expect(cleanRedditUrl(duplicateReddit)).toBe('https://reddit.com/r/test')
      
      // The actual bug we encountered
      const actualBug = 'https://reddit.comhttps://reddit.com/r/startups/comments/1234/test'
      expect(cleanRedditUrl(actualBug)).toBe('https://reddit.com/r/startups/comments/1234/test')
    })

    test('adds protocol if missing', () => {
      const noProtocol = '/r/test/comments/1234'
      expect(cleanRedditUrl(noProtocol)).toBe('https://reddit.com/r/test/comments/1234')
    })

    test('handles already clean URLs', () => {
      const cleanUrl = 'https://reddit.com/r/test/comments/1234'
      expect(cleanRedditUrl(cleanUrl)).toBe(cleanUrl)
    })
  })

  describe('isValidRedditPermalink', () => {
    test('validates full URLs', () => {
      expect(isValidRedditPermalink('https://reddit.com/r/test/comments/1234')).toBe(true)
      expect(isValidRedditPermalink('http://reddit.com/r/test/comments/1234')).toBe(true)
      expect(isValidRedditPermalink('https://old.reddit.com/r/test/comments/1234')).toBe(true)
    })

    test('validates relative paths', () => {
      expect(isValidRedditPermalink('/r/test/comments/1234')).toBe(true)
      expect(isValidRedditPermalink('/r/startups/comments/1lumxpb/test')).toBe(true)
    })

    test('rejects invalid URLs', () => {
      expect(isValidRedditPermalink('https://google.com')).toBe(false)
      expect(isValidRedditPermalink('https://reddit.com')).toBe(false)
      expect(isValidRedditPermalink('/r/test')).toBe(false)
      expect(isValidRedditPermalink('not-a-url')).toBe(false)
      expect(isValidRedditPermalink('')).toBe(false)
      expect(isValidRedditPermalink(null as unknown as string)).toBe(false)
    })
  })

  describe('extractSubredditFromPermalink', () => {
    test('extracts subreddit from valid permalinks', () => {
      expect(extractSubredditFromPermalink('/r/startups/comments/1234')).toBe('startups')
      expect(extractSubredditFromPermalink('/r/entrepreneur/comments/5678')).toBe('entrepreneur')
      expect(extractSubredditFromPermalink('https://reddit.com/r/business/comments/9012')).toBe('business')
    })

    test('returns null for invalid permalinks', () => {
      expect(extractSubredditFromPermalink('invalid-url')).toBeNull()
      expect(extractSubredditFromPermalink('')).toBeNull()
      expect(extractSubredditFromPermalink(null as unknown as string)).toBeNull()
    })
  })

  describe('extractPostIdFromPermalink', () => {
    test('extracts post ID from valid permalinks', () => {
      expect(extractPostIdFromPermalink('/r/startups/comments/1234/test')).toBe('1234')
      expect(extractPostIdFromPermalink('/r/entrepreneur/comments/5678/another-test')).toBe('5678')
      expect(extractPostIdFromPermalink('https://reddit.com/r/business/comments/9012/post-title')).toBe('9012')
    })

    test('returns null for invalid permalinks', () => {
      expect(extractPostIdFromPermalink('invalid-url')).toBeNull()
      expect(extractPostIdFromPermalink('')).toBeNull()
      expect(extractPostIdFromPermalink(null as unknown as string)).toBeNull()
    })
  })

  describe('Integration tests - Real-world scenarios', () => {
    test('handles the actual bug scenario', () => {
      // This is the exact scenario that caused the bug
      const malformedUrl = 'https://reddit.comhttps://reddit.com/r/startups/comments/1lumxpb/visiting_nyc_and_networking_as_a_founder_i_will/'
      
      // Clean the URL
      const cleanedUrl = cleanRedditUrl(malformedUrl)
      expect(cleanedUrl).toBe('https://reddit.com/r/startups/comments/1lumxpb/visiting_nyc_and_networking_as_a_founder_i_will/')
      
      // Validate it's now valid
      expect(isValidRedditPermalink(cleanedUrl)).toBe(true)
      
      // Extract components
      expect(extractSubredditFromPermalink(cleanedUrl)).toBe('startups')
      expect(extractPostIdFromPermalink(cleanedUrl)).toBe('1lumxpb')
    })

    test('handles various Reddit permalink formats', () => {
      const testCases = [
        '/r/startups/comments/1234/test-post/',
        '/r/entrepreneur/comments/5678/another-test',
        'https://reddit.com/r/business/comments/9012/post-title',
        'https://www.reddit.com/r/smallbusiness/comments/3456/title',
        'https://old.reddit.com/r/investing/comments/7890/old-reddit-url',
      ]

      testCases.forEach(permalink => {
        const formatted = formatRedditUrl(permalink)
        expect(formatted).toBeTruthy()
        expect(isValidRedditPermalink(formatted!)).toBe(true)
        
        const subreddit = extractSubredditFromPermalink(permalink)
        expect(subreddit).toBeTruthy()
        expect(subreddit).toMatch(/^[a-zA-Z0-9_]+$/)
        
        const postId = extractPostIdFromPermalink(permalink)
        expect(postId).toBeTruthy()
        expect(postId).toMatch(/^[a-zA-Z0-9]+$/)
      })
    })
  })
})