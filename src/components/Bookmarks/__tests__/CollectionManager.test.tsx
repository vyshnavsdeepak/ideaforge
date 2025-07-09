import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CollectionManager } from '../CollectionManager';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CollectionManager', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockCollections = [
    {
      id: 'collection-1',
      name: 'My Projects',
      description: 'Business ideas and projects',
      color: '#3B82F6',
      icon: '💼',
      createdAt: '2024-01-01T00:00:00Z',
      _count: { bookmarks: 5 },
    },
    {
      id: 'collection-2',
      name: 'Favorites',
      description: 'Top opportunities',
      color: '#EF4444',
      icon: '⭐',
      createdAt: '2024-01-02T00:00:00Z',
      _count: { bookmarks: 3 },
    },
  ];

  const mockEmptyCollections = {
    collections: [],
  };

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const { container } = render(<CollectionManager />);
    
    // Check for loading skeleton elements
    const loadingElements = container.querySelectorAll('.animate-pulse');
    expect(loadingElements).toHaveLength(3);
  });

  it('renders collections list after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });
    
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Business ideas and projects')).toBeInTheDocument();
    expect(screen.getByText('Top opportunities')).toBeInTheDocument();
    expect(screen.getByText('(5 items)')).toBeInTheDocument();
    expect(screen.getByText('(3 items)')).toBeInTheDocument();
  });

  it('renders empty state when no collections', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyCollections,
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('No collections yet. Create your first collection to organize your bookmarks.')).toBeInTheDocument();
    });
  });

  it('shows create form when "New Collection" button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Collection'));
    
    expect(screen.getByText('Create New Collection')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter collection name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
  });

  it('handles form submission for new collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    // Mock successful creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    // Mock refresh after creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Collection'));
    
    const nameInput = screen.getByPlaceholderText('Enter collection name');
    const descriptionInput = screen.getByPlaceholderText('Optional description');
    
    fireEvent.change(nameInput, { target: { value: 'Test Collection' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Collection',
          description: 'Test description',
          color: '#3B82F6',
          icon: '📁',
        }),
      });
    });
  });

  it('handles collection selection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    const onCollectionSelect = jest.fn();

    render(<CollectionManager onCollectionSelect={onCollectionSelect} />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('My Projects'));
    
    expect(onCollectionSelect).toHaveBeenCalledWith(mockCollections[0]);
  });

  it('highlights selected collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager selectedCollectionId="collection-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    // Find the collection container div (parent of the text)
    const selectedCollection = screen.getByText('My Projects').closest('div[class*="border"]');
    expect(selectedCollection).toHaveClass('border-blue-500');
    expect(selectedCollection).toHaveClass('bg-blue-50');
  });

  it('handles edit collection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    const editButton = screen.getAllByTitle('Edit collection')[0];
    fireEvent.click(editButton);
    
    expect(screen.getByText('Edit Collection')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Projects')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Business ideas and projects')).toBeInTheDocument();
  });

  it('handles delete collection with confirmation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    // Mock successful deletion
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    // Mock refresh after deletion
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    // Mock confirm dialog
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByTitle('Delete collection')[0];
    fireEvent.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete "My Projects"? This will remove all bookmarks in this collection.'
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bookmarks/collections/collection-1', {
        method: 'DELETE',
      });
    });

    confirmSpy.mockRestore();
  });

  it('cancels delete when confirmation is declined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    // Mock confirm dialog returning false
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByTitle('Delete collection')[0];
    fireEvent.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial load

    confirmSpy.mockRestore();
  });

  it('handles color selection in form', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Collection'));
    
    // Find color buttons by their background color
    const colorButtons = screen.getAllByRole('button').filter(
      button => button.style.backgroundColor
    );
    
    expect(colorButtons.length).toBeGreaterThan(0);
    
    // Click on a different color
    fireEvent.click(colorButtons[1]);
    
    // The button should be highlighted
    expect(colorButtons[1]).toHaveClass('border-gray-900');
  });

  it('handles icon selection in form', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Collection'));
    
    // Find icon buttons containing emojis
    const iconButtons = screen.getAllByRole('button').filter(
      button => button.textContent && /[\u{1F300}-\u{1F9FF}]/u.test(button.textContent)
    );
    
    expect(iconButtons.length).toBeGreaterThan(0);
    
    // Click on a different icon
    fireEvent.click(iconButtons[1]);
    
    // The button should be highlighted
    expect(iconButtons[1]).toHaveClass('border-gray-900');
  });

  it('resets form when cancel is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Collection'));
    
    const nameInput = screen.getByPlaceholderText('Enter collection name');
    fireEvent.change(nameInput, { target: { value: 'Test Collection' } });
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.queryByText('Create New Collection')).not.toBeInTheDocument();
  });

  it('validates required fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Collection'));
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
    
    const nameInput = screen.getByPlaceholderText('Enter collection name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    
    expect(saveButton).not.toBeDisabled();
    
    fireEvent.change(nameInput, { target: { value: '' } });
    
    expect(saveButton).toBeDisabled();
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load collections')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('handles form submission errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    // Mock failed creation
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Collection already exists' }),
    } as Response);

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Collection'));
    
    const nameInput = screen.getByPlaceholderText('Enter collection name');
    fireEvent.change(nameInput, { target: { value: 'Test Collection' } });
    
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(screen.getByText('Collection already exists')).toBeInTheDocument();
    });
  });

  it('prevents multiple form submissions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ collections: mockCollections }),
    } as Response);

    // Mock slow response
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<CollectionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('My Projects')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Collection'));
    
    const nameInput = screen.getByPlaceholderText('Enter collection name');
    fireEvent.change(nameInput, { target: { value: 'Test Collection' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    // Button should show saving state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    
    // Second click should be ignored
    fireEvent.click(saveButton);
    
    // Should only have made one API call
    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + one save
  });
});