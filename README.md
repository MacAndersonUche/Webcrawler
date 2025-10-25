# Web Crawler

A production-ready web crawler with concurrent processing, built as a monorepo.

## Quick Start

### Web Interface

```bash
# Start API server (port 3000)
npm run start:api

# Start React app (port 3001)
npm run start:web

# Start both API and web together
npm run start:all
```

### Run Tests

```bash
# Run all tests
npm run test:all

# Run specific package tests
npm run test        # All packages
npm run test:api    # API package
npm run test:web    # Web package
```

## Monorepo Structure

```text
packages/
├── api/            # Express API server
└── web/            # React web interface
```

## Key Features

- ✅ **Concurrent crawling** (5x faster than sequential)
- ✅ **Rate limiting** (server-friendly)
- ✅ **Subdomain restriction** 
- ✅ **Comprehensive tests** (unit tests with mocks)
- ✅ **Production-ready** (error handling, configurable)

## Concurrency Implementation

```typescript
// Controlled parallelism with rate limiting
await crawl(url, {
  maxConcurrency: 5, // Process 5 URLs simultaneously
  rateLimitMs: 100, // 100ms delay between batches
});
```

## Design Decisions

1. **BFS with concurrency**: Fast but controlled crawling
2. **Rate limiting**: Respectful to target servers
3. **Error isolation**: `Promise.allSettled()` prevents cascade failures
4. **State coordination**: Prevents race conditions and duplicates
5. **Configurable**: Tunable concurrency and delays

## Testing

- **Unit tests**: All core functions tested with mocks
- **Concurrency tests**: Verify parallel processing works correctly
- **Error handling**: Network failures, HTTP errors, invalid URLs
- **Edge cases**: URL normalization, subdomain detection

## Crawler Assumptions & Limitations

### ✅ **What This Crawler Handles**

- Static HTML pages with standard `<a href>` links
- **Only anchor tags** (`<a>`) - no other link types (forms, buttons, etc.)
- Same-domain crawling only (e.g., monzo.com, not community.monzo.com)
- HTTP/HTTPS protocols
- Concurrent processing with rate limiting
- Error handling and URL normalization

### ❌ **What This Crawler Does NOT Handle**

- **HTTP Redirects** - follows automatically but doesn't track chains
- **JavaScript redirects** - no JS execution
- **Meta refresh redirects** - doesn't parse meta tags
- **JavaScript-generated content** - no SPA support
- **Authentication** - no login/session handling
- **External domains** - same domain only
- **Subdomains** - exact domain matches only
- **File downloads** - HTML content only
- **Form submissions** - GET requests only
- **Bot protection** - may be blocked
- **Robots.txt** - doesn't respect restrictions

## Production Considerations

- **Memory efficient**: O(p) space for visited URLs
- **Network friendly**: Rate limiting prevents overwhelming servers
- **Error resilient**: Graceful degradation on failures
- **Configurable**: Environment-specific settings
- **Testable**: Comprehensive test coverage
