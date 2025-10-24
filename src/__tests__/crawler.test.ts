import { test, expect, describe } from 'vitest';
import { normalizeURL, isSameSubdomain, getLinksFromHTML } from '../crawler';

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
