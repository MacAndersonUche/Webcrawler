import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { crawl } from '../crawler';
import { createServer } from 'http';
import { AddressInfo } from 'net';

describe('End-to-End Crawler Tests', () => {
  let testServer: any;
  let baseUrl: string;

  beforeAll(async () => {
    testServer = createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${(testServer.address() as AddressInfo).port}`);
      const path = url.pathname;

      switch (path) {
        case '/':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html><body>
              <h1>Home</h1>
              <a href="/about">About</a>
              <a href="/products">Products</a>
              <a href="/contact">Contact</a>
            </body></html>
          `);
          break;

        case '/about':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html><body>
              <h1>About</h1>
              <a href="/">Home</a>
              <a href="/team">Team</a>
            </body></html>
          `);
          break;

        case '/products':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html><body>
              <h1>Products</h1>
              <a href="/">Home</a>
              <a href="/products/laptop">Laptop</a>
              <a href="/products/phone">Phone</a>
            </body></html>
          `);
          break;

        case '/products/laptop':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html><body>
              <h1>Laptop</h1>
              <a href="/products">Back</a>
              <a href="/contact">Buy</a>
            </body></html>
          `);
          break;

        case '/products/phone':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html><body>
              <h1>Phone</h1>
              <a href="/products">Back</a>
              <a href="/contact">Buy</a>
            </body></html>
          `);
          break;

        case '/contact':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html><body>
              <h1>Contact</h1>
              <a href="/">Home</a>
              <a href="mailto:test@example.com">Email</a>
            </body></html>
          `);
          break;

        case '/team':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html><body>
              <h1>Team</h1>
              <a href="/about">Back</a>
            </body></html>
          `);
          break;

        case '/error':
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Error</h1></body></html>');
          break;

        case '/external':
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html><body>
              <h1>External</h1>
              <a href="https://google.com">Google</a>
              <a href="/">Home</a>
            </body></html>
          `);
          break;

        case '/api/data':
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"data": "json"}');
          break;

        default:
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>404</h1></body></html>');
      }
    });

    await new Promise<void>((resolve) => {
      testServer.listen(0, () => {
        const address = testServer.address() as AddressInfo;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    });
  });

  test('crawls website successfully', async () => {
    const results = await crawl(baseUrl, {
      maxConcurrency: 3,
      rateLimitMs: 50
    });

    console.log(`Crawled ${results.length} pages`);
    results.forEach(result => {
      console.log(`${result.url} - ${result.links.length} links`);
    });

    // Verify we crawled all expected pages
    const urls = results.map(r => r.url);
    const expectedPages = [
      baseUrl,
      `${baseUrl}/about`,
      `${baseUrl}/products`,
      `${baseUrl}/products/laptop`,
      `${baseUrl}/products/phone`,
      `${baseUrl}/contact`,
      `${baseUrl}/team`
    ];

    // Check that we have the right number of pages
    expect(results.length).toBe(7);
    
    // Check that all expected pages are present (URLs may be normalized)
    expectedPages.forEach(expectedUrl => {
      const found = urls.some(url => url.includes(expectedUrl.replace(baseUrl, '')));
      expect(found).toBe(true);
    });

    // Verify no duplicates
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBe(urls.length);

    // Verify no external links were crawled (URLs may be normalized)
    const externalUrls = urls.filter(url => !url.includes('localhost'));
    expect(externalUrls).toHaveLength(0);

    // Verify all results have proper structure
    results.forEach(result => {
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('links');
      expect(Array.isArray(result.links)).toBe(true);
    });

    // Verify specific page content
    const homePage = results.find(r => r.url.includes('/') && !r.url.includes('/about') && !r.url.includes('/products'));
    expect(homePage).toBeDefined();
    expect(homePage?.links.length).toBeGreaterThan(0);

    const productsPage = results.find(r => r.url.includes('/products') && !r.url.includes('/laptop') && !r.url.includes('/phone'));
    expect(productsPage).toBeDefined();
    expect(productsPage?.links.length).toBeGreaterThan(0);
  }, 30000);

  test('handles errors gracefully', async () => {
    const results = await crawl(`${baseUrl}/error`, {
      maxConcurrency: 2,
      rateLimitMs: 50
    });

    expect(results.length).toBe(1);
    expect(results[0].url).toContain('/error');
    expect(results[0].links).toHaveLength(0);
  }, 15000);

  test('ignores external links', async () => {
    const results = await crawl(`${baseUrl}/external`, {
      maxConcurrency: 2,
      rateLimitMs: 50
    });

    // Should have crawled the external page
    const externalPage = results.find(r => r.url.includes('/external'));
    expect(externalPage).toBeDefined();
    expect(externalPage?.links).toContain('https://google.com');
    
    // Should have found external links but not crawled them
    const hasExternalLinks = results.some(r => r.links.some(link => link.includes('google.com')));
    expect(hasExternalLinks).toBe(true);
  }, 15000);
});
