import { Metadata } from 'next';
import { JobsPageContent } from './JobsPageContent';

export const metadata: Metadata = {
  title: 'Jobs & Status',
  description: 'Monitor system health, job queues, and processing metrics',
};

export default function JobsPage() {
  return <JobsPageContent />;
}