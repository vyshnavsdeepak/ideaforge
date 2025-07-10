import { Metadata } from 'next';
import { Suspense } from 'react';
import { PostsPageContent } from '../../components/PostsPageContent';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Posts',
  description: 'Browse and analyze Reddit posts for business opportunities',
};

export default function RedditPostsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Loading Reddit posts...</p>
          </div>
        </div>
      }
    >
      <PostsPageContent />
    </Suspense>
  );
}