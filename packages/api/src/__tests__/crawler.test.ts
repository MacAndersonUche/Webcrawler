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

  test('processQueue handles high concurrency correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    let callCount = 0;
    
    mockFetch.mockImplementation((url) => {
      callCount++;
      const html = url === 'https://example.com' 
        ? `<html><body>
            <a href="https://example.com/page1">Page 1</a>
            <a href="https://example.com/page2">Page 2</a>
            <a href="https://example.com/page3">Page 3</a>
            <a href="https://example.com/page4">Page 4</a>
            <a href="https://example.com/page5">Page 5</a>
          </body></html>`
        : '<html><body><p>No more links</p></body></html>';
      
      return Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(html)
      } as any);
    });

    const results = await crawl('https://example.com', { maxConcurrency: 3, rateLimitMs: 0 });
    
    expect(results).toHaveLength(6); // Home + 5 pages
    expect(callCount).toBe(6);
  });

  test('processQueue respects rate limiting', async () => {
    const mockFetch = vi.mocked(fetch);
    const startTime = Date.now();
    
    mockFetch.mockImplementation((url) => {
      const html = url === 'https://example.com' 
        ? '<html><body><a href="https://example.com/page1">Page 1</a></body></html>'
        : '<html><body><p>No more links</p></body></html>';
      
      return Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(html)
      } as any);
    });

    const results = await crawl('https://example.com', { maxConcurrency: 1, rateLimitMs: 100 });
    const endTime = Date.now();
    
    expect(results).toHaveLength(2);
    expect(endTime - startTime).toBeGreaterThanOrEqual(100); // Should respect rate limit
  });

  test('processQueue handles concurrent failures gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    let callCount = 0;
    
    mockFetch.mockImplementation((url) => {
      callCount++;
      if (url === 'https://example.com') {
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve(`
            <html><body>
              <a href="https://example.com/page1">Page 1</a>
              <a href="https://example.com/page2">Page 2</a>
              <a href="https://example.com/page3">Page 3</a>
            </body></html>
          `)
        } as any);
      } else if (url === 'https://example.com/page2') {
        // Simulate network error for page2
        return Promise.reject(new Error('Network timeout'));
      } else {
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve('<html><body><p>No more links</p></body></html>')
        } as any);
      }
    });

    const results = await crawl('https://example.com', { maxConcurrency: 3, rateLimitMs: 0 });
    
    expect(results).toHaveLength(4); // Home + 3 pages (page2 fails but still recorded)
    expect(results.find(r => r.url === 'https://example.com/page2')?.links).toHaveLength(0);
  });

  test('processQueue handles empty queue correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'text/html']]),
      text: () => Promise.resolve('<html><body><p>No links</p></body></html>')
    } as any);

    const results = await crawl('https://example.com', { maxConcurrency: 5, rateLimitMs: 0 });
    
    expect(results).toHaveLength(1);
    expect(results[0].links).toHaveLength(0);
  });

  test('processQueue handles large queue efficiently', async () => {
    const mockFetch = vi.mocked(fetch);
    let callCount = 0;
    
    mockFetch.mockImplementation((url) => {
      callCount++;
      if (url === 'https://example.com') {
        // Create a page with many links
        const links = Array.from({ length: 20 }, (_, i) => 
          `<a href="https://example.com/page${i + 1}">Page ${i + 1}</a>`
        ).join('');
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve(`<html><body>${links}</body></html>`)
        } as any);
      } else {
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve('<html><body><p>No more links</p></body></html>')
        } as any);
      }
    });

    const results = await crawl('https://example.com', { maxConcurrency: 5, rateLimitMs: 0 });
    
    expect(results).toHaveLength(21); // Home + 20 pages
    expect(callCount).toBe(21);
  });

  test('processQueue handles mixed success and failure scenarios', async () => {
    const mockFetch = vi.mocked(fetch);
    let callCount = 0;
    
    mockFetch.mockImplementation((url) => {
      callCount++;
      if (url === 'https://example.com') {
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve(`
            <html><body>
              <a href="https://example.com/success">Success</a>
              <a href="https://example.com/error">Error</a>
              <a href="https://example.com/timeout">Timeout</a>
            </body></html>
          `)
        } as any);
      } else if (url === 'https://example.com/error') {
        return Promise.resolve({
          ok: false,
          status: 500,
          headers: new Map(),
          text: () => Promise.resolve('Server Error')
        } as any);
      } else if (url === 'https://example.com/timeout') {
        return Promise.reject(new Error('Request timeout'));
      } else {
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-type', 'text/html']]),
          text: () => Promise.resolve('<html><body><p>Success page</p></body></html>')
        } as any);
      }
    });

    const results = await crawl('https://example.com', { maxConcurrency: 2, rateLimitMs: 0 });
    
    expect(results).toHaveLength(4); // All pages should be recorded
    expect(results.find(r => r.url === 'https://example.com/success')).toBeDefined();
    expect(results.find(r => r.url === 'https://example.com/error')?.links).toHaveLength(0);
    expect(results.find(r => r.url === 'https://example.com/timeout')?.links).toHaveLength(0);
  });

  test('processQueue handles concurrency limits correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    const concurrentCalls: number[] = [];
    let activeCalls = 0;
    
    mockFetch.mockImplementation(async (url) => {
      activeCalls++;
      concurrentCalls.push(activeCalls);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const html = url === 'https://example.com' 
        ? '<html><body><a href="https://example.com/page1">Page 1</a><a href="https://example.com/page2">Page 2</a></body></html>'
        : '<html><body><p>No more links</p></body></html>';
      
      activeCalls--;
      
      return Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(html)
      } as any);
    });

    const results = await crawl('https://example.com', { maxConcurrency: 2, rateLimitMs: 0 });
    
    expect(results).toHaveLength(3);
    // Verify we never exceeded concurrency limit
    expect(Math.max(...concurrentCalls)).toBeLessThanOrEqual(2);
  });

  test('processQueue handles rate limiting with high concurrency', async () => {
    const mockFetch = vi.mocked(fetch);
    const callTimes: number[] = [];
    
    mockFetch.mockImplementation((url) => {
      callTimes.push(Date.now());
      
      const html = url === 'https://example.com' 
        ? '<html><body><a href="https://example.com/page1">Page 1</a></body></html>'
        : '<html><body><p>No more links</p></body></html>';
      
      return Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve(html)
      } as any);
    });

    const results = await crawl('https://example.com', { maxConcurrency: 5, rateLimitMs: 50 });
    
    expect(results).toHaveLength(2);
    // Verify rate limiting was applied
    if (callTimes.length > 1) {
      const timeDiff = callTimes[1] - callTimes[0];
      expect(timeDiff).toBeGreaterThanOrEqual(50);
    }
  });
});
