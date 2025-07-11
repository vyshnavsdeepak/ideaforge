import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookmarkButton } from '../BookmarkButton';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('BookmarkButton', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockBookmarkData = {
    isBookmarked: true,
    bookmarks: [
      {
        id: 'bookmark-1',
        collection: {
          id: 'collection-1',
          name: 'My Collection',
          color: '#3B82F6',
          icon: '📁',
        },
      },
    ],
    collections: [
      {
        id: 'collection-1',
        name: 'My Collection',
        color: '#3B82F6',
        icon: '📁',
      },
      {
        id: 'collection-2',
        name: 'Favorites',
        color: '#EF4444',
        icon: '❤️',
      },
    ],
  };

  const mockEmptyBookmarkData = {
    isBookmarked: false,
    bookmarks: [],
    collections: [
      {
        id: 'collection-1',
        name: 'My Collection',
        color: '#3B82F6',
        icon: '📁',
      },
    ],
  };

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const { container } = render(<BookmarkButton opportunityId="test-opportunity" />);
    
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders unbookmarked state when not bookmarked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyBookmarkData,
    } as Response);

    render(<BookmarkButton opportunityId="test-opportunity" showText={true} />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Quick bookmark')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Bookmark')).toBeInTheDocument();
  });

  it('renders bookmarked state when bookmarked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookmarkData,
    } as Response);

    render(<BookmarkButton opportunityId="test-opportunity" showText={true} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /bookmarked/i })).toHaveAttribute('title', 'Bookmarked');
    });
    
    expect(screen.getByText('Bookmarked')).toBeInTheDocument();
  });

  it('handles different sizes correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyBookmarkData,
    } as Response);

    const { rerender } = render(<BookmarkButton opportunityId="test-opportunity" size="sm" />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Quick bookmark')).toHaveClass('p-1');
    });

    rerender(<BookmarkButton opportunityId="test-opportunity" size="lg" />);
    
    expect(screen.getByTitle('Quick bookmark')).toHaveClass('p-3');
  });

  it('renders minimal variant correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyBookmarkData,
    } as Response);

    render(<BookmarkButton opportunityId="test-opportunity" variant="minimal" />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Quick bookmark')).toBeInTheDocument();
    });
    
    // Minimal variant should not show text
    expect(screen.queryByText('Bookmark')).not.toBeInTheDocument();
  });

  it('toggles bookmark state when clicked', async () => {
    // Initial load - not bookmarked
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyBookmarkData,
    } as Response);

    // Bookmark action
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    // Reload after bookmark
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookmarkData,
    } as Response);

    const onBookmarkChange = jest.fn();
    
    render(
      <BookmarkButton 
        opportunityId="test-opportunity" 
        onBookmarkChange={onBookmarkChange}
        showText={true}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Bookmark')).toBeInTheDocument();
    });

    // Click to bookmark
    fireEvent.click(screen.getByTitle('Quick bookmark'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: 'test-opportunity',
          action: 'bookmark',
        }),
      });
    });

    expect(onBookmarkChange).toHaveBeenCalledWith(true);
  });

  it('shows collections dropdown when bookmarked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookmarkData,
    } as Response);

    render(<BookmarkButton opportunityId="test-opportunity" />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Manage collections')).toBeInTheDocument();
    });

    // Click dropdown trigger
    fireEvent.click(screen.getByTitle('Manage collections'));
    
    expect(screen.getByText('Manage Collections')).toBeInTheDocument();
    expect(screen.getByText('Currently in:')).toBeInTheDocument();
    expect(screen.getByText('My Collection')).toBeInTheDocument();
  });

  it('adds opportunity to collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookmarkData,
    } as Response);

    // Add to collection action
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    // Reload after adding
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookmarkData,
    } as Response);

    const onBookmarkChange = jest.fn();
    
    render(
      <BookmarkButton 
        opportunityId="test-opportunity" 
        onBookmarkChange={onBookmarkChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByTitle('Manage collections')).toBeInTheDocument();
    });

    // Open dropdown
    fireEvent.click(screen.getByTitle('Manage collections'));
    
    await waitFor(() => {
      expect(screen.getByText('Add to collection:')).toBeInTheDocument();
    });

    // Click on available collection (Favorites)
    fireEvent.click(screen.getByText('Favorites'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: 'test-opportunity',
          collectionId: 'collection-2',
          action: 'bookmark',
        }),
      });
    });

    expect(onBookmarkChange).toHaveBeenCalledWith(true);
  });

  it('removes opportunity from collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookmarkData,
    } as Response);

    // Remove from collection action
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    // Reload after removing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyBookmarkData,
    } as Response);

    const onBookmarkChange = jest.fn();
    
    render(
      <BookmarkButton 
        opportunityId="test-opportunity" 
        onBookmarkChange={onBookmarkChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByTitle('Manage collections')).toBeInTheDocument();
    });

    // Open dropdown
    fireEvent.click(screen.getByTitle('Manage collections'));
    
    await waitFor(() => {
      expect(screen.getByText('Currently in:')).toBeInTheDocument();
    });

    // Click remove button
    fireEvent.click(screen.getByTitle('Remove from collection'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: 'test-opportunity',
          collectionId: 'collection-1',
          action: 'unbookmark',
        }),
      });
    });

    expect(onBookmarkChange).toHaveBeenCalledWith(false);
  });

  it('closes dropdown when clicking overlay', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookmarkData,
    } as Response);

    const { container } = render(<BookmarkButton opportunityId="test-opportunity" />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Manage collections')).toBeInTheDocument();
    });

    // Open dropdown
    fireEvent.click(screen.getByTitle('Manage collections'));
    
    expect(screen.getByText('Manage Collections')).toBeInTheDocument();

    // Click overlay (the fixed inset-0 div)
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    
    await waitFor(() => {
      expect(screen.queryByText('Manage Collections')).not.toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<BookmarkButton opportunityId="test-opportunity" />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading bookmark status:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('disables button when processing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyBookmarkData,
    } as Response);

    // Make the bookmark action hang
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<BookmarkButton opportunityId="test-opportunity" showText={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Bookmark')).toBeInTheDocument();
    });

    const button = screen.getByTitle('Quick bookmark');
    
    // Click to bookmark
    fireEvent.click(button);
    
    expect(button).toBeDisabled();
  });

  it('renders correctly with showText=false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyBookmarkData,
    } as Response);

    render(<BookmarkButton opportunityId="test-opportunity" showText={false} />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Quick bookmark')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Bookmark')).not.toBeInTheDocument();
  });
});