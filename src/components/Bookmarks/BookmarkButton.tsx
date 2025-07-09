'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkPlus, Plus, X } from 'lucide-react';

interface BookmarkCollection {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface BookmarkData {
  id: string;
  collection: BookmarkCollection;
}

interface BookmarkButtonProps {
  opportunityId: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'default' | 'minimal';
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export function BookmarkButton({
  opportunityId,
  size = 'md',
  showText = false,
  variant = 'default',
  onBookmarkChange,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { icon: 'w-4 h-4', button: 'p-1', text: 'text-xs' },
    md: { icon: 'w-5 h-5', button: 'p-2', text: 'text-sm' },
    lg: { icon: 'w-6 h-6', button: 'p-3', text: 'text-base' },
  };

  const config = sizeConfig[size];

  const loadBookmarkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/bookmarks/check?opportunityId=${opportunityId}`);
      if (!response.ok) return;

      const data = await response.json();
      setIsBookmarked(data.isBookmarked);
      setBookmarks(data.bookmarks || []);
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Error loading bookmark status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [opportunityId]);

  // Load bookmark status
  useEffect(() => {
    loadBookmarkStatus();
  }, [loadBookmarkStatus]);

  const handleQuickBookmark = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const action = isBookmarked ? 'unbookmark' : 'bookmark';
      const response = await fetch('/api/bookmarks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          action,
        }),
      });

      if (response.ok) {
        const newBookmarkedState = !isBookmarked;
        setIsBookmarked(newBookmarkedState);
        onBookmarkChange?.(newBookmarkedState);
        
        if (newBookmarkedState) {
          // Refresh bookmark data to get the new bookmark
          await loadBookmarkStatus();
        } else {
          setBookmarks([]);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/bookmarks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          collectionId,
          action: 'bookmark',
        }),
      });

      if (response.ok) {
        await loadBookmarkStatus();
        setShowDropdown(false);
        onBookmarkChange?.(true);
      }
    } catch (error) {
      console.error('Error adding to collection:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFromCollection = async (collectionId: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/bookmarks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          collectionId,
          action: 'unbookmark',
        }),
      });

      if (response.ok) {
        await loadBookmarkStatus();
        const stillBookmarked = bookmarks.length > 1;
        onBookmarkChange?.(stillBookmarked);
      }
    } catch (error) {
      console.error('Error removing from collection:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`${config.button} rounded-md bg-gray-100 dark:bg-gray-700 animate-pulse`}>
        <div className={`${config.icon} bg-gray-200 dark:bg-gray-600 rounded`} />
      </div>
    );
  }

  const buttonBaseClasses = `
    ${config.button} rounded-md transition-all duration-200 relative
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleQuickBookmark}
        disabled={isProcessing}
        className={`${buttonBaseClasses} ${
          isBookmarked
            ? 'text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
            : 'text-gray-600 hover:text-gray-700 bg-gray-50 hover:bg-gray-100'
        }`}
        title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        <Bookmark className={`${config.icon} ${isBookmarked ? 'fill-current' : ''}`} />
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Main bookmark button */}
      <button
        onClick={handleQuickBookmark}
        disabled={isProcessing}
        className={`${buttonBaseClasses} ${
          isBookmarked
            ? 'text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
            : 'text-gray-600 hover:text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
        }`}
        title={isBookmarked ? 'Bookmarked' : 'Add bookmark'}
      >
        <div className="flex items-center space-x-2">
          <Bookmark className={`${config.icon} ${isBookmarked ? 'fill-current' : ''}`} />
          {showText && (
            <span className={config.text}>
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown trigger for collections */}
      {isBookmarked && (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`${buttonBaseClasses} ml-1 text-gray-600 hover:text-gray-700 bg-white hover:bg-gray-50 border border-gray-300`}
          title="Manage collections"
        >
          <BookmarkPlus className={config.icon} />
        </button>
      )}

      {/* Collections dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Manage Collections
            </h3>
            
            {/* Current bookmarks */}
            {bookmarks.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Currently in:
                </h4>
                <div className="space-y-1">
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{bookmark.collection.icon}</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {bookmark.collection.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCollection(bookmark.collection.id)}
                        className="text-red-500 hover:text-red-600 p-1"
                        title="Remove from collection"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available collections */}
            {collections.length > 0 && (
              <div>
                <h4 className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Add to collection:
                </h4>
                <div className="space-y-1">
                  {collections
                    .filter(col => !bookmarks.some(b => b.collection.id === col.id))
                    .map((collection) => (
                      <button
                        key={collection.id}
                        onClick={() => handleAddToCollection(collection.id)}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
                      >
                        <span className="text-sm">{collection.icon}</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {collection.name}
                        </span>
                        <Plus className="w-3 h-3 text-gray-400 ml-auto" />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}