'use client';

import { Suspense } from 'react';
import { MarketIntelligenceContent } from '../../components/MarketIntelligenceContent';
import { Loader2 } from 'lucide-react';

export default function MarketIntelligencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Loading market intelligence...</p>
          </div>
        </div>
      }
    >
      <MarketIntelligenceContent />
    </Suspense>
  );
}