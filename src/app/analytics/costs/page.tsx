import { Metadata } from 'next';
import { AICostAnalyticsContent } from './AICostAnalyticsContent';

export const metadata: Metadata = {
  title: 'AI Costs | Analytics',
  description: 'Monitor and optimize your AI usage costs across all models and operations',
};

export default function AICostAnalyticsPage() {
  return <AICostAnalyticsContent />;
}