'use client';

import { useState } from 'react';
import { Bookmark, Plus, X, ChevronDown } from 'lucide-react';
import { api } from '@/trpc/client';



interface TRPCBookmarkButtonProps {
  opportunityId: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'default' | 'minimal';
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export function TRPCBookmarkButton({
  opportunityId,
  size = 'md',
  showText = false,
  variant = 'default',
  onBookmarkChange,
}: TRPCBookmarkButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: { icon: 'w-4 h-4', button: 'p-1', text: 'text-xs' },
    md: { icon: 'w-5 h-5', button: 'p-2', text: 'text-sm' },
    lg: { icon: 'w-6 h-6', button: 'p-3', text: 'text-base' },
  };

  const config = sizeConfig[size];

  // Get bookmark status and collections
  const { data: bookmarkStatus, isLoading, refetch } = api.bookmarks.checkStatus.useQuery(
    { opportunityId },
    {
      refetchOnWindowFocus: false,
    }
  );

  const isBookmarked = bookmarkStatus?.isBookmarked ?? false;
  const bookmarks = bookmarkStatus?.bookmarks ?? [];
  const collections = bookmarkStatus?.collections ?? [];

  // Toggle bookmark mutation
  const toggleBookmarkMutation = api.bookmarks.toggleBookmark.useMutation({
    onSuccess: () => {
      refetch();
      onBookmarkChange?.(!isBookmarked);
    },
    onError: (error) => {
      console.error('Error toggling bookmark:', error);
    },
  });

  const handleQuickBookmark = async () => {
    if (toggleBookmarkMutation.isPending) return;

    const action = isBookmarked ? 'unbookmark' : 'bookmark';
    toggleBookmarkMutation.mutate({
      opportunityId,
      action,
    });
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (toggleBookmarkMutation.isPending) return;

    toggleBookmarkMutation.mutate({
      opportunityId,
      collectionId,
      action: 'bookmark',
    });
    setShowDropdown(false);
  };

  const handleRemoveFromCollection = async (collectionId: string) => {
    if (toggleBookmarkMutation.isPending) return;

    toggleBookmarkMutation.mutate({
      opportunityId,
      collectionId,
      action: 'unbookmark',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="relative flex">
        <div className={`${config.button} rounded-md bg-gray-100 dark:bg-gray-700 animate-pulse`}>
          <div className={`${config.icon} bg-gray-300 dark:bg-gray-600 rounded`}></div>
        </div>
      </div>
    );
  }

  const isProcessing = toggleBookmarkMutation.isPending;

  // Available collections (not already bookmarked)
  const bookmarkedCollectionIds = new Set(bookmarks.map(b => b.collection.id));
  const availableCollections = collections.filter(c => !bookmarkedCollectionIds.has(c.id));

  if (variant === 'minimal') {
    return (
      <div className="relative">
        <button
          onClick={handleQuickBookmark}
          disabled={isProcessing}
          className={`
            ${config.button} rounded-md transition-all duration-200 relative
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isBookmarked 
              ? 'text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100' 
              : 'text-gray-600 hover:text-gray-700 bg-white hover:bg-gray-50'
            }
          `}
          title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <Bookmark className={`${config.icon} ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex">
      {/* Main bookmark button */}
      <button
        onClick={handleQuickBookmark}
        disabled={isProcessing}
        className={`
          ${config.button} rounded-md transition-all duration-200 relative
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
         ${isBookmarked 
            ? 'rounded-r-none text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200' 
            : 'rounded-r-none text-gray-600 hover:text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
          }
        `}
        title={isBookmarked ? 'Quick remove bookmark' : 'Quick bookmark'}
      >
        <div className="flex items-center space-x-2">
          <Bookmark className={`${config.icon} ${isBookmarked ? 'fill-current' : ''}`} />
          {showText && <span className={config.text}>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>}
        </div>
      </button>

      {/* Dropdown toggle */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`${config.button} rounded-l-none border-l-0 transition-all duration-200 ${
          isBookmarked 
            ? 'text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200' 
            : 'text-gray-600 hover:text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        title="Choose collection"
      >
        <ChevronDown className={`${config.icon} transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-3">
              {/* Current bookmarks */}
              {bookmarks.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Saved in
                  </h4>
                  <div className="space-y-1">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{bookmark.collection.icon}</span>
                          <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                            {bookmark.collection.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCollection(bookmark.collection.id)}
                          disabled={isProcessing}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Remove from collection"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available collections */}
              {availableCollections.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Add to Collection
                  </h4>
                  <div className="space-y-1">
                    {availableCollections.map((collection) => (
                      <button
                        key={collection.id}
                        onClick={() => handleAddToCollection(collection.id)}
                        disabled={isProcessing}
                        className="w-full flex items-center space-x-2 p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
                      >
                        <span className="text-sm">{collection.icon}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {collection.name}
                        </span>
                        <Plus className="w-4 h-4 text-gray-400 ml-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {collections.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No collections available
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Create a collection to organize your bookmarks
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}