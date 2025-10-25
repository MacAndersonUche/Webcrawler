import { test, expect, describe, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// Mock the core crawler
vi.mock('../crawler', () => ({
  crawl: vi.fn()
}));

import { crawl } from '../crawler';
import app from '../index';

const mockCrawl = vi.mocked(crawl);

describe('API Server', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0);
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  });

  afterAll(async () => {
    // Close the server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('POST /api/crawl - successful crawl', async () => {
    const mockResults = [
      { url: 'https://example.com', links: ['https://example.com/about'] },
      { url: 'https://example.com/about', links: [] }
    ];
    
    mockCrawl.mockResolvedValueOnce(mockResults);

    const response = await fetch(`${baseUrl}/api/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      results: mockResults,
      message: 'Crawl complete! Found 2 pages.'
    });
    
    expect(mockCrawl).toHaveBeenCalledWith('https://example.com', {
      maxConcurrency: 5,
      rateLimitMs: 100
    });
  });

  test('POST /api/crawl - missing URL', async () => {
    const response = await fetch(`${baseUrl}/api/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toEqual({
      error: 'URL is required'
    });
  });

  test('POST /api/crawl - invalid URL format', async () => {
    const response = await fetch(`${baseUrl}/api/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-valid-url' })
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toEqual({
      error: 'Invalid URL format'
    });
  });

  test('POST /api/crawl - crawl error', async () => {
    mockCrawl.mockRejectedValueOnce(new Error('Network error'));

    const response = await fetch(`${baseUrl}/api/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data).toEqual({
      error: 'Network error'
    });
  });

  test('POST /api/crawl - unknown error', async () => {
    mockCrawl.mockRejectedValueOnce('String error');

    const response = await fetch(`${baseUrl}/api/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data).toEqual({
      error: 'Unknown error occurred'
    });
  });

  test('POST /api/crawl - empty results', async () => {
    mockCrawl.mockResolvedValueOnce([]);

    const response = await fetch(`${baseUrl}/api/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      results: [],
      message: 'Crawl complete! Found 0 pages.'
    });
  });

  test('POST /api/crawl - handles concurrent requests', async () => {
    const mockResults = [{ url: 'https://example.com', links: [] }];
    mockCrawl.mockResolvedValue(mockResults);

    const promises = [
      fetch(`${baseUrl}/api/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      }),
      fetch(`${baseUrl}/api/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://test.com' })
      })
    ];

    const responses = await Promise.all(promises);
    
    expect(responses[0].status).toBe(200);
    expect(responses[1].status).toBe(200);
    expect(mockCrawl).toHaveBeenCalledTimes(2);
  });
});
