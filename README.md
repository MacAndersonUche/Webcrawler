# Web Crawler

A simple, production-ready web crawler that visits URLs on the same domain and reports the links found on each page.

## Features

- ✅ Crawls all pages on a single subdomain
- ✅ Prevents external domain/subdomain crawling
- ✅ Reports each visited URL with all links found
- ✅ Handles relative and absolute URLs
- ✅ Comprehensive test coverage
- ✅ Error handling for network failures and invalid URLs
- ✅ Clean, maintainable code structure

## Installation

```bash
npm install
```

## Usage

Run the crawler with a starting URL:

```bash
npm start <url>
```

Example:

```bash
npm start https://monzo.com
```

## Running Tests

```bash
npm test
```

## Design Decisions

### 1. **Architecture: Simple Queue-Based BFS**

I chose a breadth-first search (BFS) approach using a simple queue rather than recursive DFS for several reasons:

- **Memory efficiency**: BFS with a queue is more memory-efficient than recursive DFS, which can cause stack overflow on large sites
- **Predictable behavior**: Sequential processing makes debugging easier and behavior more predictable
- **Rate limiting friendly**: Makes it easier to add rate limiting in the future (just add delays between queue items)

**Trade-off**: BFS is slightly slower than concurrent approaches, but more stable and easier to reason about.

### 2. **Subdomain Restriction**

The crawler strictly enforces same-hostname crawling:

- `monzo.com` will crawl `monzo.com` pages
- `monzo.com` will NOT crawl `community.monzo.com` or `blog.monzo.com`
- External domains (e.g., `facebook.com`) are filtered out

This is implemented by comparing the full hostname in the `isSameSubdomain` function.

**Trade-off**: Stricter than just domain matching, but aligns with the requirement to limit to "one subdomain".

### 3. **URL Normalization**

URLs are normalized to prevent duplicate visits:

- Removes trailing slashes: `example.com/page/` → `example.com/page`
- Removes fragment identifiers: `example.com/page#section` → `example.com/page`
- Preserves query parameters: `example.com/page?id=1` stays as-is

**Trade-off**: Query parameters are treated as distinct pages. This could cause duplicates if the site uses session IDs in URLs, but it's safer than ignoring them (which could miss distinct content).

### 4. **Sequential vs Concurrent Crawling**

I implemented sequential crawling (one page at a time) rather than concurrent:

**Pros of sequential**:

- Respectful to servers (no request flooding)
- Simpler error handling
- Easier to debug and maintain
- No race conditions with shared state

**Cons**:

- Slower than concurrent crawling

**Trade-off**: For a production crawler, I chose reliability and server-friendliness over speed. Adding concurrency would be straightforward (use `Promise.all` with a limited batch size), but requires more sophisticated error handling and rate limiting.

### 5. **Error Handling**

Errors are handled gracefully at multiple levels:

- Network errors: Logged and skipped, crawl continues
- HTTP errors (404, 500, etc.): Logged but recorded as visited
- Invalid URLs: Silently skipped
- Non-HTML content: Skipped (images, PDFs, etc.)

**Trade-off**: Errors are logged but don't stop the crawl. This means you get partial results even if some pages fail.

### 6. **Protocol Filtering**

Only `http:` and `https:` protocols are followed. This filters out:

- `javascript:` pseudo-protocols
- `mailto:` links
- `tel:` links
- File protocols

**Trade-off**: This prevents the crawler from following non-web links, which is appropriate for a web crawler.

### 7. **Visited State Management**

Uses a `Set` for tracking visited URLs:

- O(1) lookup time
- Prevents duplicate visits
- Memory efficient for reasonable site sizes

**Trade-off**: All visited URLs are kept in memory. For very large sites (millions of pages), this could be a concern. A production system might use a bloom filter or database-backed visited set.

### 8. **Output Format**

The output is human-readable and shows:

1. Real-time crawling progress (each URL as it's visited)
2. Final summary with all URLs and their links

**Trade-off**: Human-readable over machine-readable. For production, I'd add JSON output options or structured logging.

## Testing Strategy

The test suite covers:

- **URL normalization**: Edge cases like trailing slashes, fragments, query params
- **Subdomain detection**: Different domains, subdomains, and invalid URLs
- **HTML parsing**: Absolute/relative URLs, empty anchors, invalid protocols

**Test coverage**: All core functions have comprehensive unit tests. Integration tests (actual web crawling) are omitted to avoid external dependencies.

**Trade-off**: No integration tests means we don't test actual network behavior, but unit tests cover all business logic without flaky network dependencies.

## Limitations and Future Improvements

### Current Limitations

1. **No concurrency**: Crawls one page at a time
2. **No rate limiting**: Could overwhelm servers (though sequential helps)
3. **In-memory only**: Visited state stored in memory
4. **No robots.txt respect**: Doesn't check robots.txt files
5. **No sitemap support**: Doesn't use sitemap.xml
6. **No depth limiting**: Could crawl very deep link chains

### Potential Improvements

1. **Add concurrency**: Use `Promise.all` with configurable parallelism
2. **Add rate limiting**: Delay between requests (e.g., 100ms)
3. **Respect robots.txt**: Parse and honor robots.txt rules
4. **Add depth limiting**: Max depth parameter to prevent infinite crawls
5. **Add timeout handling**: Request timeouts to prevent hanging
6. **Persistent storage**: Database for visited URLs on large crawls
7. **Retry logic**: Exponential backoff for failed requests
8. **Better output formats**: JSON, CSV, sitemap XML
9. **User agent handling**: Custom user agent string
10. **Link classification**: Distinguish internal vs external links in output

## Code Structure

```
src/
├── crawler.ts          # Core crawling logic
├── index.ts           # CLI interface and output formatting
└── __tests__/
    └── crawler.test.ts # Unit tests
```

### Key Functions

- `crawl(startURL)`: Main crawling function, returns array of results
- `normalizeURL(url)`: Normalizes URLs to prevent duplicates
- `isSameSubdomain(base, target)`: Checks if URLs share same hostname
- `getLinksFromHTML(html, baseURL)`: Extracts links from HTML
- `fetchPage(url)`: Fetches and validates a single page

## Dependencies

- **jsdom**: HTML parsing (standard, well-maintained library)
- **vitest**: Modern testing framework
- **typescript**: Type safety and better developer experience
- **tsx**: TypeScript execution for CLI

All dependencies are standard, well-maintained libraries. No heavyweight frameworks are used, keeping the implementation transparent and maintainable.

## Time Complexity

- **URL normalization**: O(1)
- **Subdomain check**: O(1)
- **Link extraction**: O(n) where n is number of links on page
- **Overall crawl**: O(p × l) where p is pages visited and l is average links per page

## Space Complexity

- **Visited set**: O(p) where p is unique pages visited
- **Queue**: O(l) where l is links in queue
- **Results**: O(p × l) storing all pages and their links

## Author Notes

This implementation prioritizes:

1. **Code clarity**: Easy to understand and maintain
2. **Reliability**: Robust error handling
3. **Testability**: Well-tested core functions
4. **Production readiness**: Real-world error handling and edge cases

The design favors simplicity and reliability over performance. For very large sites or high-performance requirements, the architecture supports adding concurrency, caching, and other optimizations without major refactoring.
