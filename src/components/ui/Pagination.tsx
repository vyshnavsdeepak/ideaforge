'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  className?: string;
  createPageUrl: (page: number) => string;
  showInfo?: boolean;
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  className = '',
  createPageUrl,
  showInfo = true,
  maxVisiblePages = 5,
}: PaginationProps) {
  // Scroll to top when component mounts (when page changes)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  if (totalPages <= 1) {
    return null;
  }

  // Calculate which pages to show
  const getVisiblePages = () => {
    const pages: number[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let start = Math.max(1, currentPage - halfVisible);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    // Adjust start if we're near the end
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  const baseButtonClass = "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2";
  const enabledButtonClass = "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700";
  const disabledButtonClass = "text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-not-allowed";

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {showInfo && (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing {startItem} to {endItem} of {totalCount.toLocaleString()} results
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className={`${baseButtonClass} ${enabledButtonClass}`}
            scroll={false} // Prevent default scroll, we handle it manually
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Link>
        ) : (
          <span className={`${baseButtonClass} ${disabledButtonClass}`}>
            <ChevronLeft className="w-4 h-4" />
            Previous
          </span>
        )}
        
        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {/* First page if not visible */}
          {visiblePages[0] > 1 && (
            <>
              <Link
                href={createPageUrl(1)}
                className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                scroll={false}
              >
                1
              </Link>
              {visiblePages[0] > 2 && (
                <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
              )}
            </>
          )}
          
          {/* Visible page numbers */}
          {visiblePages.map((page) => {
            const isActive = page === currentPage;
            return isActive ? (
              <span
                key={page}
                className="px-3 py-1 text-sm font-medium rounded-md bg-purple-600 text-white"
              >
                {page}
              </span>
            ) : (
              <Link
                key={page}
                href={createPageUrl(page)}
                className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                scroll={false}
              >
                {page}
              </Link>
            );
          })}
          
          {/* Last page if not visible */}
          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
              )}
              <Link
                href={createPageUrl(totalPages)}
                className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                scroll={false}
              >
                {totalPages}
              </Link>
            </>
          )}
        </div>

        {/* Next Button */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className={`${baseButtonClass} ${enabledButtonClass}`}
            scroll={false}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className={`${baseButtonClass} ${disabledButtonClass}`}>
            Next
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </div>
  );
}