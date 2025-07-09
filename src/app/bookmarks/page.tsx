import { Suspense } from 'react';
import { BookmarksPageContent } from './BookmarksPageContent';
import { Loader2 } from 'lucide-react';

export default function BookmarksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Loading bookmarks...</p>
          </div>
        </div>
      }
    >
      <BookmarksPageContent />
    </Suspense>
  );
}

export const metadata = {
  title: 'Bookmarks - IdeaForge',
  description: 'Manage your bookmarked opportunities and collections',
};