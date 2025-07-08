'use client';

import { useState } from 'react';

export function FixUrlsButton() {
  const [isFixing, setIsFixing] = useState(false);

  const handleFixUrls = async () => {
    if (!confirm('Fix malformed Reddit URLs in the database? This will update existing posts with corrected URLs.')) {
      return;
    }

    setIsFixing(true);
    
    try {
      const response = await fetch('/api/admin/fix-urls', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\nFixed ${result.fixedCount} URLs out of ${result.totalPosts} posts.`);
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('Error fixing URLs:', error);
      alert('❌ Error fixing URLs');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <button
      onClick={handleFixUrls}
      disabled={isFixing}
      className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
    >
      {isFixing ? '🔧 Fixing URLs...' : '🔧 Fix URLs'}
    </button>
  );
}