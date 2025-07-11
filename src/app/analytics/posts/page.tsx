import { Metadata } from 'next';
import { PostAnalyticsContent } from './PostAnalyticsContent';

export const metadata: Metadata = {
  title: 'Posts | Analytics',
  description: 'Detailed cost breakdown for individual post analyses',
};

export default function PostAnalyticsPage() {
  return <PostAnalyticsContent />;
}