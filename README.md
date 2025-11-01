# Web Crawler

A web crawler that visits each URL found on the same domain as a starting URL. For each URL visited, it prints the URL and the links found on that page. The crawler is limited to the exact same hostname (e.g., starting with `https://monzo.com/` crawls monzo.com but not facebook.com or community.monzo.com).

This is my own implementation—no frameworks like scrapy or go-colly. I used JSDOM for HTML parsing.

## Quick Start

```bash
npm install
npm run start:all
```

Open <http://localhost:3001> in your browser to use the web interface.

## Project Structure

Monorepo with two packages:

- **`packages/api`**: Express API server with core crawler implementation
- **`packages/web`**: React web interface for interacting with the crawler

## Design & Implementation

**Core Features:**

- Concurrent crawling with configurable limits (default: 5 concurrent requests)
- Rate limiting (default: 100ms between requests) to be respectful to servers
- Strict domain matching (only exact same hostname, no subdomains)
- URL normalization (removes trailing slashes, fragments, normalizes paths)
- Deduplication using `Set` data structures for visited and in-progress URLs
- Graceful error handling:
  - Network errors and HTTP failures are caught and logged without stopping the crawl
  - Invalid URLs are skipped silently
  - Failed URLs are recorded with empty link arrays
  - `Promise.allSettled` ensures one failure doesn't block other concurrent requests

**Architecture:**

- Breadth-first traversal using a URL queue (processes pages level by level)
- Concurrent processing with in-progress tracking to prevent duplicate requests
- Filters by content-type (only `text/html`) and protocol (only HTTP/HTTPS)

## API Usage

**Web Interface:**

- Start the app and use the UI at <http://localhost:3001>

**Direct API:**

```bash
npm run start:api
```

Then POST to `http://localhost:3000/api/crawl`:

```json
{
  "url": "https://example.com"
}
```

## Performance

- Single-process and memory-bound (large sites >10k pages will exhaust RAM and crash)
- No request timeouts (long-hanging requests could block the crawl loop)
- No persistent storage for progress or deduplication
- All results stored in memory during crawl execution

## Scalability

- Not horizontally scalable (no shared state, no distributed queue)
- For large-scale crawling, would need a distributed architecture (e.g., Redis queue, database persistence, worker pool)
- Single Node.js instance with event loop concurrency

## Testing

Comprehensive test coverage including:

- Unit tests for URL normalization, link extraction, and domain matching
- Integration tests for API endpoints
- End-to-end tests with real HTTP servers

Run tests:

```bash
npm run test
npm run test:e2e
```

## Assumptions & Limitations

**What it handles:**

- Static HTML pages (no JavaScript execution)
- Links in `<a href>` tags only
- Same domain only (exact hostname match, no subdomains)
- Public pages (no authentication)
- HTTP/HTTPS GET requests only
- Relative and absolute URL resolution

**What it doesn't handle:**

- JavaScript-generated content or redirects
- External domains or subdomains
- Authentication or protected pages
- Form submissions or POST requests
- robots.txt compliance
- Request timeouts or retries

**Technical constraints:**

- No resumption of interrupted crawls (must restart from beginning if interrupted)
- No retry logic (failed requests are not retried)
- Assumes reasonable page sizes (< 1MB) and stable network connections
- Assumes target servers can handle concurrent requests
- No distributed state coordination
