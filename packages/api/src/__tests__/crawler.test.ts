import { test, expect, describe, vi, beforeEach } from 'vitest';
import { normalizeURL, isSameSubdomain, getLinksFromHTML, crawl } from '../crawler';

// Mock fetch globally
global.fetch = vi.fn();

describe('normalizeURL', () => {
  test('removes trailing slash from root path', () => {
    const url = normalizeURL('https://example.com/');
    expect(url).toBe('https://example.com');
  });

  test('removes trailing slash from nested path', () => {
    const url = normalizeURL('https://example.com/path/');
    expect(url).toBe('https://example.com/path');
  });

  test('preserves path without trailing slash', () => {
    const url = normalizeURL('https://example.com/path');
    expect(url).toBe('https://example.com/path');
  });

  test('removes fragment identifiers', () => {
    const url = normalizeURL('https://example.com/path#section');
    expect(url).toBe('https://example.com/path');
  });

  test('preserves query parameters', () => {
    const url = normalizeURL('https://example.com/path?key=value');
    expect(url).toBe('https://example.com/path?key=value');
  });

  test('throws error for invalid URL', () => {
    expect(() => normalizeURL('not a url')).toThrow('Invalid URL');
  });
});

describe('isSameSubdomain', () => {
  test('returns true for same domain', () => {
    expect(isSameSubdomain('https://monzo.com', 'https://monzo.com/about')).toBe(true);
  });

  test('returns false for different subdomain', () => {
    expect(isSameSubdomain('https://monzo.com', 'https://community.monzo.com')).toBe(false);
  });

  test('returns false for different domain', () => {
    expect(isSameSubdomain('https://monzo.com', 'https://facebook.com')).toBe(false);
  });

  test('returns true for same subdomain with different paths', () => {
    expect(isSameSubdomain('https://blog.example.com', 'https://blog.example.com/post')).toBe(true);
  });

  test('returns false for invalid URLs', () => {
    expect(isSameSubdomain('not a url', 'https://example.com')).toBe(false);
  });
});

describe('getLinksFromHTML', () => {
  test('extracts absolute URLs', () => {
    const html = '<html><body><a href="https://example.com/page1">Link</a></body></html>';
    const links = getLinksFromHTML(html, 'https://example.com');
    expect(links).toContain('https://example.com/page1');
  });

  test('converts relative URLs to absolute', () => {
    const html = '<html><body><a href="/about">About</a></body></html>';
    const links = getLinksFromHTML(html, 'https://example.com');
    expect(links).toContain('https://example.com/about');
  });

  test('handles multiple links', () => {
    const html = `
      <html><body>
        <a href="/page1">Page 1</a>
        <a href="/page2">Page 2</a>
        <a href="https://external.com">External</a>
      </body></html>
    `;
    const links = getLinksFromHTML(html, 'https://example.com');
    expect(links).toHaveLength(3);
    expect(links).toContain('https://example.com/page1');
    expect(links).toContain('https://example.com/page2');
    expect(links).toContain('https://external.com/');
  });

  test('ignores anchors without href', () => {
    const html = '<html><body><a>No href</a></body></html>';
    const links = getLinksFromHTML(html, 'https://example.com');
    expect(links).toHaveLength(0);
  });

  test('ignores invalid URLs', () => {
    const html = '<html><body><a href="javascript:void(0)">Invalid</a></body></html>';
    const links = getLinksFromHTML(html, 'https://example.com');
    expect(links).toHaveLength(0);
  });

  test('returns empty array for HTML with no links', () => {
    const html = '<html><body><p>No links here</p></body></html>';
    const links = getLinksFromHTML(html, 'https://example.com');
    expect(links).toHaveLength(0);
  });
});

describe('crawl function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('crawls a simple site with one page', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation((url) => {
      if (url === 'https://example.com') {
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve('<html><body><a href="/about">About</a></body></html>')
        } as any);
      } else {
        // Mock the /about page to return no links to prevent further crawling
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve('<html><body><p>About page</p></body></html>')
        } as any);
      }
    });

    const results = await crawl('https://example.com', { maxConcurrency: 1, rateLimitMs: 0 });
    
    expect(results).toHaveLength(2); // Both pages should be crawled
    expect(results[0].url).toBe('https://example.com');
    expect(results[0].links).toContain('https://example.com/about');
    expect(results[1].url).toBe('https://example.com/about');
  });

  test('respects concurrency limits', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation((url) => {
      // Return different content based on URL to avoid infinite loops
      if (url === 'https://example.com') {
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve(`<html><body><a href="https://example.com/page2">Page 2</a></body></html>`)
        } as any);
      } else {
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve(`<html><body><p>No more links</p></body></html>`)
        } as any);
      }
    });

    const results = await crawl('https://example.com', { maxConcurrency: 2, rateLimitMs: 0 });
    
    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial page + page2
    expect(results).toHaveLength(2);
  });

  test('handles network errors gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const results = await crawl('https://example.com', { maxConcurrency: 1, rateLimitMs: 0 });
    
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com');
    expect(results[0].links).toHaveLength(0);
  });

  test('skips non-HTML content', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/pdf']]),
      text: () => Promise.resolve('PDF content')
    } as any);

    const results = await crawl('https://example.com', { maxConcurrency: 1, rateLimitMs: 0 });
    
    expect(results).toHaveLength(1);
    expect(results[0].links).toHaveLength(0);
  });

  test('prevents duplicate crawling', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation((url) => {
      const html = url === 'https://example.com' 
        ? '<html><body><a href="/about">About</a><a href="/">Home</a></body></html>'
        : '<html><body><a href="/">Home</a></body></html>';
      
      return Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(html)
      } as any);
    });

    const results = await crawl('https://example.com', { maxConcurrency: 1, rateLimitMs: 0 });
    
    // Should not crawl the same URL twice
    const urls = results.map(r => r.url);
    expect(urls).toHaveLength(2);
    expect(new Set(urls).size).toBe(2); // No duplicates
  });

  test('respects subdomain boundaries', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation((url) => {
      const html = url === 'https://example.com' 
        ? '<html><body><a href="https://sub.example.com">Sub</a><a href="https://external.com">External</a></body></html>'
        : '';
      
      return Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(html)
      } as any);
    });

    const results = await crawl('https://example.com', { maxConcurrency: 1, rateLimitMs: 0 });
    
    expect(results).toHaveLength(1);
    expect(results[0].links).toHaveLength(2); // Links are found but not crawled
  });

  test('handles HTTP errors', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Map(),
      text: () => Promise.resolve('Not found')
    } as any);

    const results = await crawl('https://example.com', { maxConcurrency: 1, rateLimitMs: 0 });
    
    expect(results).toHaveLength(1);
    expect(results[0].links).toHaveLength(0);
  });
});
