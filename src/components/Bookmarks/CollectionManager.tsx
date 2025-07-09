'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Folder } from 'lucide-react';

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

interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  createdAt: string;
  bookmarks?: BookmarkData[];
  _count: {
    bookmarks: number;
  };
}

export type { Collection };

interface CollectionManagerProps {
  onCollectionSelect?: (collection: Collection) => void;
  selectedCollectionId?: string;
  showCreateForm?: boolean;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6B7280',
];

const DEFAULT_ICONS = [
  '📁', '⭐', '🎯', '💡', '🚀', '📚', '💼', '🔥', '⚡', '🌟',
  '📝', '🎨', '🏆', '💎', '🔮', '🎪', '🌈', '🎭', '🎵', '🎲',
];

export function CollectionManager({
  onCollectionSelect,
  selectedCollectionId,
  showCreateForm = false,
}: CollectionManagerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(showCreateForm);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLORS[0],
    icon: DEFAULT_ICONS[0],
  });

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bookmarks/collections');
      if (!response.ok) throw new Error('Failed to load collections');
      
      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Error loading collections:', error);
      setError('Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingCollection 
        ? `/api/bookmarks/collections/${editingCollection.id}`
        : '/api/bookmarks/collections';
      
      const method = editingCollection ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save collection');
      }

      await loadCollections();
      resetForm();
    } catch (error) {
      console.error('Error saving collection:', error);
      setError(error instanceof Error ? error.message : 'Failed to save collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color,
      icon: collection.icon,
    });
    setShowForm(true);
  };

  const handleDelete = async (collection: Collection) => {
    if (!confirm(`Are you sure you want to delete "${collection.name}"? This will remove all bookmarks in this collection.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/bookmarks/collections/${collection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete collection');
      }

      await loadCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      setError('Failed to delete collection');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: DEFAULT_COLORS[0],
      icon: DEFAULT_ICONS[0],
    });
    setEditingCollection(null);
    setShowForm(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-md" />
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Collections
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {editingCollection ? 'Edit Collection' : 'Create New Collection'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter collection name"
                required
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color 
                        ? 'border-gray-900 dark:border-gray-100' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    className={`w-8 h-8 rounded-md border-2 flex items-center justify-center ${
                      formData.icon === icon 
                        ? 'border-gray-900 dark:border-gray-100 bg-gray-100 dark:bg-gray-700' 
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-sm">{icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Collections List */}
      <div className="space-y-2">
        {collections.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No collections yet. Create your first collection to organize your bookmarks.</p>
          </div>
        ) : (
          collections.map((collection) => (
            <div
              key={collection.id}
              className={`flex items-center p-4 rounded-lg border transition-colors cursor-pointer ${
                selectedCollectionId === collection.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => onCollectionSelect?.(collection)}
            >
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: collection.color }}
              >
                <span className="text-lg">{collection.icon}</span>
              </div>
              
              <div className="ml-4 flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {collection.name}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({collection._count.bookmarks} items)
                  </span>
                </div>
                {collection.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {collection.description}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(collection);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Edit collection"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(collection);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete collection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}