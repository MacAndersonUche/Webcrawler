# Web Crawler

A web crawler that visits each URL found on the same domain as a starting URL. For each URL visited, it prints the URL and the links found on that page. The crawler is limited to the exact same hostname (e.g., starting with `https://monzo.com/` crawls monzo.com but not facebook.com or community.monzo.com).

This is my own implementation - no frameworks like scrapy or go-colly. I used JSDOM for HTML parsing.

## Quick Start

```bash
npm install
npm run start:all
```

Open <http://localhost:3001> in your browser.

## Running Tests

```bash
npm run test
```

## Design

- Concurrent crawling with configurable limits (default: 5 concurrent requests)
- Rate limiting (default: 100ms between requests)
- Strict domain matching (only exact same domain, no subdomains)
- Graceful error handling

## Assumptions & Limitations

**What it handles:**

- Static HTML pages (no JavaScript execution)
- Links in `<a href>` tags only
- Same domain only (exact hostname match, no subdomains)
- Public pages (no authentication)
- HTTP/HTTPS GET requests only

**What it doesn't handle:**

- JavaScript-generated content or redirects
- External domains or subdomains
- Authentication or protected pages
- Form submissions or POST requests
- File downloads (PDFs, images, etc.)
- robots.txt compliance
- Request timeouts or retries

**Technical constraints:**

- Single Node.js instance (no distributed crawling)
- In-memory storage only (no persistence)
- No resumption of interrupted crawls
- Assumes reasonable page sizes (< 1MB) and stable network
