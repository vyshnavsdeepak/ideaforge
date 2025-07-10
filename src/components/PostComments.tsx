'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  User, 
  ArrowBigUp, 
  Clock, 
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';

interface Comment {
  id: string;
  redditId: string;
  body: string;
  author: string;
  score: number;
  createdUtc: string;
  parentId: string | null;
  isTopLevel: boolean;
  depth: number;
  permalink: string | null;
}

interface PostCommentsProps {
  postId: string;
  initialCommentsCount?: number;
}

export function PostComments({ postId, initialCommentsCount = 0 }: PostCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [hasComments, setHasComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      const data = await response.json();
      
      if (data.success) {
        setComments(data.comments || []);
        setHasComments(data.hasComments);
        setLastFetched(new Date());
      } else {
        setError(data.error || 'Failed to load comments');
      }
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (force = false) => {
    setFetching(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Reload comments after fetching
        await loadComments();
      } else {
        setError(data.error || 'Failed to fetch comments');
      }
    } catch (err) {
      setError('Failed to fetch comments from Reddit');
      console.error('Error fetching comments:', err);
    } finally {
      setFetching(false);
    }
  };

  // Load comments on component mount
  useEffect(() => {
    loadComments();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getScoreColor = (score: number) => {
    if (score > 10) return 'text-green-600 dark:text-green-400';
    if (score > 0) return 'text-gray-600 dark:text-gray-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDepthIndentation = (depth: number) => {
    return Math.min(depth * 16, 64); // Max indent of 64px
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Comments ({comments.length})
          </h3>
          {hasComments && (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!hasComments && (
            <button
              onClick={() => fetchComments(false)}
              disabled={fetching}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 disabled:opacity-50"
            >
              {fetching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {fetching ? 'Fetching...' : 'Fetch Comments'}
            </button>
          )}
          
          {hasComments && (
            <button
              onClick={() => fetchComments(true)}
              disabled={fetching}
              className="inline-flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              {fetching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {fetching ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <div className="font-medium text-red-800 dark:text-red-200">Error</div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading comments...</span>
        </div>
      )}

      {!loading && !hasComments && !fetching && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <div className="text-lg mb-2">No Comments Loaded</div>
          <div className="text-sm">
            Click &ldquo;Fetch Comments&rdquo; to load comments from Reddit for this post.
          </div>
          {initialCommentsCount > 0 && (
            <div className="text-xs mt-2 text-blue-600 dark:text-blue-400">
              Reddit shows {initialCommentsCount} comments available
            </div>
          )}
        </div>
      )}

      {!loading && hasComments && comments.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <div className="text-lg mb-2">No Comments Found</div>
          <div className="text-sm">
            This post has no comments or all comments were deleted/removed.
          </div>
        </div>
      )}

      {!loading && comments.length > 0 && (
        <div className="space-y-4">
          {lastFetched && (
            <div className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
              Last updated: {formatDate(lastFetched.toISOString())}
            </div>
          )}
          
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              style={{
                marginLeft: `${getDepthIndentation(comment.depth)}px`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      u/{comment.author}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(comment.createdUtc)}</span>
                  </div>
                  
                  {!comment.isTopLevel && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      Reply • Depth {comment.depth}
                    </span>
                  )}
                </div>
                
                <div className={`flex items-center gap-1 ${getScoreColor(comment.score)}`}>
                  <ArrowBigUp className="w-4 h-4" />
                  <span className="font-medium">{comment.score}</span>
                </div>
              </div>
              
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {comment.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}