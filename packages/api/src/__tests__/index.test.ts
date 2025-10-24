import { test, expect, describe, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock the core crawler
vi.mock('@webcrawler/core', () => ({
  crawl: vi.fn()
}));

import { crawl } from '@webcrawler/core';
import app from '../index';

const mockCrawl = vi.mocked(crawl);

describe('API Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('POST /api/crawl - successful crawl', async () => {
    const mockResults = [
      { url: 'https://example.com', links: ['https://example.com/about'] },
      { url: 'https://example.com/about', links: [] }
    ];
    
    mockCrawl.mockResolvedValueOnce(mockResults);

    const response = await request(app)
      .post('/api/crawl')
      .send({ url: 'https://example.com' })
      .expect(200);

    expect(response.body).toEqual({
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
    const response = await request(app)
      .post('/api/crawl')
      .send({})
      .expect(400);

    expect(response.body).toEqual({
      error: 'URL is required'
    });
  });

  test('POST /api/crawl - invalid URL format', async () => {
    const response = await request(app)
      .post('/api/crawl')
      .send({ url: 'not-a-valid-url' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Invalid URL format'
    });
  });

  test('POST /api/crawl - crawl error', async () => {
    mockCrawl.mockRejectedValueOnce(new Error('Network error'));

    const response = await request(app)
      .post('/api/crawl')
      .send({ url: 'https://example.com' })
      .expect(500);

    expect(response.body).toEqual({
      error: 'Network error'
    });
  });

  test('POST /api/crawl - unknown error', async () => {
    mockCrawl.mockRejectedValueOnce('String error');

    const response = await request(app)
      .post('/api/crawl')
      .send({ url: 'https://example.com' })
      .expect(500);

    expect(response.body).toEqual({
      error: 'Unknown error occurred'
    });
  });

  test('POST /api/crawl - empty results', async () => {
    mockCrawl.mockResolvedValueOnce([]);

    const response = await request(app)
      .post('/api/crawl')
      .send({ url: 'https://example.com' })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      results: [],
      message: 'Crawl complete! Found 0 pages.'
    });
  });

  test('POST /api/crawl - handles concurrent requests', async () => {
    const mockResults = [{ url: 'https://example.com', links: [] }];
    mockCrawl.mockResolvedValue(mockResults);

    const promises = [
      request(app).post('/api/crawl').send({ url: 'https://example.com' }),
      request(app).post('/api/crawl').send({ url: 'https://test.com' })
    ];

    const responses = await Promise.all(promises);
    
    expect(responses[0].status).toBe(200);
    expect(responses[1].status).toBe(200);
    expect(mockCrawl).toHaveBeenCalledTimes(2);
  });
});
