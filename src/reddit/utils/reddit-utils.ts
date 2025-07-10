/**
 * Utility functions for Reddit URL handling
 */

/**
 * Formats a Reddit permalink to a full URL
 * Handles both relative paths and full URLs
 */
export function formatRedditUrl(permalink: string | null | undefined): string | null {
  if (!permalink) return null;
  
  // If it's already a full URL, return as is
  if (permalink.startsWith('http://') || permalink.startsWith('https://')) {
    return permalink;
  }
  
  // If it starts with /, it's a relative path from reddit.com
  if (permalink.startsWith('/')) {
    return `https://reddit.com${permalink}`;
  }
  
  // If it doesn't start with /, assume it's a relative path and add the slash
  return `https://reddit.com/${permalink}`;
}

/**
 * Extracts the subreddit from a Reddit permalink
 */
export function extractSubredditFromPermalink(permalink: string): string | null {
  if (!permalink) return null;
  
  // Match pattern: /r/subreddit/comments/...
  const match = permalink.match(/\/r\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts the post ID from a Reddit permalink
 */
export function extractPostIdFromPermalink(permalink: string): string | null {
  if (!permalink) return null;
  
  // Match pattern: /r/subreddit/comments/postid/...
  const match = permalink.match(/\/r\/[^\/]+\/comments\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Validates if a permalink looks like a valid Reddit URL
 */
export function isValidRedditPermalink(permalink: string): boolean {
  if (!permalink) return false;
  
  // Check if it's a full URL
  if (permalink.startsWith('http')) {
    return permalink.includes('reddit.com') && permalink.includes('/r/');
  }
  
  // Check if it's a relative path
  return permalink.startsWith('/r/') && permalink.includes('/comments/');
}

/**
 * Clean up malformed Reddit URLs
 */
export function cleanRedditUrl(url: string): string {
  if (!url) return '';
  
  // Remove duplicate protocols
  url = url.replace(/https?:\/\/https?:\/\//g, 'https://');
  
  // Remove duplicate reddit.com
  url = url.replace(/reddit\.com.*?reddit\.com/g, 'reddit.com');
  
  // Ensure it starts with https://
  if (!url.startsWith('http')) {
    url = `https://reddit.com${url}`;
  }
  
  return url;
}