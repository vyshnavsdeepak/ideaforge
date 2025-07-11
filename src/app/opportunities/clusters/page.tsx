import { Metadata } from 'next';
import { OpportunityClustersContent } from './OpportunityClustersContent';

export const metadata: Metadata = {
  title: 'Clusters | Opportunities',
  description: 'Discover similar opportunities and frequently requested ideas from Reddit communities',
};

export default function OpportunityClustersPage() {
  return <OpportunityClustersContent />;
}