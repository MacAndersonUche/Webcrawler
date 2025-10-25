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

- ✅ **Rate limiting** (server-friendly)
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

## Production Considerations

- **Memory efficient**: O(p) space for visited URLs
- **Network friendly**: Rate limiting prevents overwhelming servers
- **Error resilient**: Graceful degradation on failures
- **Configurable**: Environment-specific settings
- **Testable**: Comprehensive test coverage
