import { test, expect, describe, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock fetch globally
global.fetch = vi.fn();

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders initial form', () => {
    render(<App />);

    expect(screen.getByText('🕷️ Web Crawler')).toBeInTheDocument();
    expect(
      screen.getByText('Crawl websites and discover all internal links')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter URL to crawl')
    ).toBeInTheDocument();
    expect(screen.getByText('Start Crawling')).toBeInTheDocument();
  });

  test('handles form submission with valid URL', async () => {
    const mockResults = [
      { url: 'https://example.com', links: ['https://example.com/about'] },
      { url: 'https://example.com/about', links: [] },
    ];

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, results: mockResults }),
    } as any);

    render(<App />);

    const input = screen.getByPlaceholderText('Enter URL to crawl');
    const button = screen.getByText('Start Crawling');

    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);

    expect(screen.getByText('Crawling... Please wait.')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Crawl Results')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Pages visited
      expect(screen.getByText('1')).toBeInTheDocument(); // Total links
    });
  });

  test('handles API error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid URL' }),
    } as any);

    render(<App />);

    const input = screen.getByPlaceholderText('Enter URL to crawl');
    const button = screen.getByText('Start Crawling');

    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid URL')).toBeInTheDocument();
    });
  });

  test('handles network error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    const input = screen.getByPlaceholderText('Enter URL to crawl');
    const button = screen.getByText('Start Crawling');

    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  test('disables button when loading', () => {
    render(<App />);

    const input = screen.getByPlaceholderText('Enter URL to crawl');
    const button = screen.getByText('Start Crawling');

    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByText('Crawling...')).toBeInTheDocument();
  });

  test('disables button when URL is empty', () => {
    render(<App />);

    const button = screen.getByText('Start Crawling');
    expect(button).toBeDisabled();
  });

  test('displays results correctly', async () => {
    const mockResults = [
      {
        url: 'https://example.com',
        links: ['https://example.com/about', 'https://example.com/contact'],
      },
      { url: 'https://example.com/about', links: [] },
    ];

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, results: mockResults }),
    } as any);

    render(<App />);

    const input = screen.getByPlaceholderText('Enter URL to crawl');
    const button = screen.getByText('Start Crawling');

    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.getByText('2 links found')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/about')).toBeInTheDocument();
      expect(
        screen.getByText('https://example.com/contact')
      ).toBeInTheDocument();
    });
  });

  test('handles empty results', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, results: [] }),
    } as any);

    render(<App />);

    const input = screen.getByPlaceholderText('Enter URL to crawl');
    const button = screen.getByText('Start Crawling');

    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // Pages visited
      expect(screen.getByText('0')).toBeInTheDocument(); // Total links
    });
  });
});
