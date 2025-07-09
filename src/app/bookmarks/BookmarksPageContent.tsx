'use client';

import { useState, useEffect, useCallback } from 'react';
import { CollectionManager, type Collection } from '../../components/Bookmarks/CollectionManager';
import { BookmarkButton } from '../../components/Bookmarks/BookmarkButton';
import { Badge } from '../../components/ui/Badge';
import { 
  Bookmark, 
  Search, 
  Star, 
  ChevronRight,
  Grid,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react';
import Link from 'next/link';

interface BookmarkCollection extends Collection {
  bookmarks: BookmarkData[];
}

interface BookmarkData {
  id: string;
  notes: string | null;
  rating: number | null;
  tags: string[];
  createdAt: string;
  opportunity: {
    id: string;
    title: string;
    description: string;
    overallScore: number;
    viabilityThreshold: boolean;
    businessType: string | null;
    industryVertical: string | null;
    niche: string | null;
    createdAt: string;
  };
}

export function BookmarksPageContent() {
  const [selectedCollection, setSelectedCollection] = useState<BookmarkCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'score' | 'rating' | 'title'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bookmarks/collections');
      if (!response.ok) throw new Error('Failed to load collections');
      
      const data = await response.json();
      
      // Auto-select first collection if available
      if (data.collections?.length > 0 && !selectedCollection) {
        setSelectedCollection(data.collections[0]);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollection]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleCollectionSelect = (collection: Collection) => {
    // Ensure collection has bookmarks array before setting
    const collectionWithBookmarks = {
      ...collection,
      bookmarks: collection.bookmarks || []
    } as BookmarkCollection;
    setSelectedCollection(collectionWithBookmarks);
  };

  const filteredBookmarks = selectedCollection?.bookmarks.filter(bookmark => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      bookmark.opportunity.title.toLowerCase().includes(query) ||
      bookmark.opportunity.description.toLowerCase().includes(query) ||
      bookmark.opportunity.businessType?.toLowerCase().includes(query) ||
      bookmark.opportunity.industryVertical?.toLowerCase().includes(query) ||
      bookmark.opportunity.niche?.toLowerCase().includes(query) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(query)) ||
      bookmark.notes?.toLowerCase().includes(query)
    );
  }) || [];

  const sortedBookmarks = [...filteredBookmarks].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;
    
    switch (sortBy) {
      case 'created':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      case 'score':
        aValue = a.opportunity.overallScore;
        bValue = b.opportunity.overallScore;
        break;
      case 'rating':
        aValue = a.rating || 0;
        bValue = b.rating || 0;
        break;
      case 'title':
        aValue = a.opportunity.title;
        bValue = b.opportunity.title;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300">Loading your bookmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Bookmarks
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Organize and manage your saved opportunities in collections
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Collections */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 sm:p-6">
                <CollectionManager
                  onCollectionSelect={handleCollectionSelect}
                  selectedCollectionId={selectedCollection?.id}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedCollection ? (
              <div className="space-y-6">
                {/* Collection Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: selectedCollection.color }}
                      >
                        <span className="text-xl">{selectedCollection.icon}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {selectedCollection.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedCollection._count.bookmarks} opportunities
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* View Mode Toggle */}
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded-md ${
                            viewMode === 'grid' 
                              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' 
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                          }`}
                        >
                          <Grid className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded-md ${
                            viewMode === 'list' 
                              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' 
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                          }`}
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search bookmarks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'created' | 'score' | 'rating' | 'title')}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                      >
                        <option value="created">Sort by Date</option>
                        <option value="score">Sort by Score</option>
                        <option value="rating">Sort by Rating</option>
                        <option value="title">Sort by Title</option>
                      </select>
                      
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bookmarks Grid/List */}
                {sortedBookmarks.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                    <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {searchQuery ? 'No bookmarks found' : 'No bookmarks in this collection'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {searchQuery 
                        ? 'Try adjusting your search terms'
                        : 'Start bookmarking opportunities from the opportunities page'
                      }
                    </p>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
                    : 'space-y-4'
                  }>
                    {sortedBookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow ${
                          viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
                        }`}
                      >
                        <div className={viewMode === 'list' ? 'flex-1' : ''}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <Link
                                href={`/opportunities/${bookmark.opportunity.id}`}
                                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                              >
                                {bookmark.opportunity.title}
                              </Link>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  Score: {bookmark.opportunity.overallScore.toFixed(1)}
                                </span>
                                <Badge variant={bookmark.opportunity.viabilityThreshold ? 'success' : 'default'}>
                                  {bookmark.opportunity.viabilityThreshold ? 'Viable' : 'Monitor'}
                                </Badge>
                              </div>
                            </div>
                            <BookmarkButton
                              opportunityId={bookmark.opportunity.id}
                              size="sm"
                              variant="minimal"
                            />
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {bookmark.opportunity.description}
                          </p>

                          {/* Bookmark metadata */}
                          <div className="space-y-2">
                            {bookmark.rating && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Rating:</span>
                                {renderStars(bookmark.rating)}
                              </div>
                            )}

                            {bookmark.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {bookmark.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {bookmark.notes && (
                              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {bookmark.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>Bookmarked {formatDate(bookmark.createdAt)}</span>
                            <Link
                              href={`/opportunities/${bookmark.opportunity.id}`}
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <span>View Details</span>
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Collection
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a collection from the sidebar to view your bookmarked opportunities
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}