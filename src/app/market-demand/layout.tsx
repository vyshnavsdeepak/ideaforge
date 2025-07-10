import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Demand',
  description: 'Discover market trends and insights from Reddit discussions',
};

export default function MarketDemandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}