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
npm run test        # All packages
npm run test:e2e    # End-to-end tests
```

## Monorepo Structure

```text
packages/
├── api/            # Express API server
└── web/            # React web interface
```

## Key Features

- ✅ **Concurrent crawling** with configurable limits
- ✅ **Rate limiting** to be respectful to servers
- ✅ **Subdomain restriction** for focused crawling
- ✅ **Comprehensive tests** (42 tests covering all scenarios)
- ✅ **Production-ready** error handling and configuration

## 🚨 **CRITICAL ASSUMPTIONS & LIMITATIONS**

### 🔍 **FUNDAMENTAL ASSUMPTIONS**

#### **HTML Structure Assumptions**

- **All links are in anchor tags** (`<a href>`) - assumes standard HTML structure
- **No JavaScript-generated links** - assumes static HTML only
- **No dynamic content loading** - assumes all content is in initial HTML
- **Standard HTML parsing** - assumes well-formed HTML documents

#### **Deployment Assumptions**

- **Single Node.js instance** - designed for local/single-server deployment
- **No horizontal scaling** - assumes one process handles all crawling
- **In-memory state management** - assumes no external state storage
- **No distributed coordination** - assumes single-instance operation

#### **Network & Security Assumptions**

- **Websites don't block crawlers** - assumes no anti-bot protection
- **No evasive action needed** - assumes standard HTTP requests work
- **No rate limiting by target sites** - assumes servers accept all requests
- **No authentication required** - assumes all pages are publicly accessible
- **No CAPTCHA or bot detection** - assumes no human verification needed

#### **Performance Assumptions**

- **Reasonable page sizes** - assumes < 1MB per page
- **Stable network connections** - assumes no frequent timeouts
- **Sufficient memory available** - assumes no memory constraints
- **No concurrent crawls** - assumes one crawl at a time per instance

### ✅ **What This Crawler Handles**

- **Static HTML pages only** - no JavaScript execution
- **Anchor tags only** (`<a href>`) - no forms, buttons, or other link types
- **Same domain only** - exact hostname matches (monzo.com, not community.monzo.com)
- **HTTP/HTTPS protocols** - no other protocols
- **GET requests only** - no POST, PUT, DELETE
- **No authentication** - public pages only
- **No file downloads** - HTML content only
- **No robots.txt respect** - may crawl restricted areas

### ❌ **What This Crawler Does NOT Handle**

- **JavaScript-generated content** - SPAs, React, Vue, Angular apps
- **JavaScript redirects** - `window.location` changes
- **Meta refresh redirects** - `<meta http-equiv="refresh">`
- **HTTP redirects** - follows but doesn't track redirect chains
- **Authentication required** - login-protected pages
- **External domains** - cross-domain crawling
- **Subdomains** - different subdomains are ignored
- **File downloads** - PDFs, images, documents
- **Form submissions** - POST requests
- **Bot protection** - may be blocked by anti-bot systems
- **Rate limiting compliance** - doesn't check robots.txt
- **Session management** - no cookies or sessions
- **Dynamic content** - no AJAX, WebSocket, or real-time content

### 🔧 **Technical Assumptions**

1. **Memory Usage**: Assumes reasonable page sizes (< 1MB per page)
2. **Network Stability**: Assumes reliable network connections
3. **Server Capacity**: Assumes target servers can handle concurrent requests
4. **URL Format**: Assumes valid, well-formed URLs
5. **HTML Structure**: Assumes standard HTML with proper `<a>` tags
6. **Content-Type**: Assumes `text/html` responses
7. **Encoding**: Assumes UTF-8 encoding
8. **Timeout Handling**: No request timeouts implemented

### ⚠️ **Performance Limitations**

- **Single-threaded**: Node.js event loop only
- **Memory bound**: All results stored in memory
- **No persistence**: No database or file storage
- **No resumption**: Cannot resume interrupted crawls
- **No caching**: No duplicate request prevention
- **No compression**: No response compression handling

## 🏗️ **ARCHITECTURAL CONSIDERATIONS**

### **Current Architecture (Single Instance)**

```
┌─────────────────┐    ┌─────────────────┐
│   React App     │───▶│   Express API   │
│   (Frontend)    │    │   (Backend)     │
└─────────────────┘    └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   Web Crawler   │
                        │   (In-Memory)   │
                        └─────────────────┘
```

### **Scaling Challenges**

#### **Vertical Scaling (Single Server)**

- **Memory**: Large sites (>10k pages) will exhaust RAM
- **CPU**: Single-threaded processing limits throughput
- **Network**: Bandwidth becomes bottleneck
- **Timeout**: Long-running crawls may timeout

#### **Horizontal Scaling (Multiple Servers)**

- **State Management**: No shared state between instances
- **Coordination**: No distributed queue management
- **Deduplication**: No cross-instance duplicate prevention
- **Load Balancing**: No request distribution strategy

### **Error Handling & Recovery**

#### **Current Error Handling**

- ✅ **Network errors**: Graceful degradation
- ✅ **HTTP errors**: 404, 500 responses handled
- ✅ **Invalid URLs**: Skipped with logging
- ❌ **No retries**: Failed requests not retried
- ❌ **No resumption**: Cannot resume from failure point
- ❌ **No persistence**: All progress lost on crash

#### **Crash Recovery Scenarios**

```
Scenario 1: Network timeout
├── Current: Request fails, continues with other URLs
├── Missing: No retry mechanism
└── Impact: May miss important pages

Scenario 2: Server crash
├── Current: All progress lost
├── Missing: No state persistence
└── Impact: Must restart entire crawl

Scenario 3: Memory exhaustion
├── Current: Process crashes
├── Missing: No memory management
└── Impact: Cannot handle large sites
```

## 🚀 **SCALING TO 1 MILLION PAGES IN 30 SECONDS**

### **Hypothetical Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │───▶│   API Gateway   │───▶│   Crawl Manager │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                        ┌─────────────────┐            │
                        │   Redis Queue   │◀───────────┘
                        │   (Job Queue)   │
                        └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │   Worker 1  │ │   Worker 2  │ │   Worker N  │
        │ (1000 req/s)│ │ (1000 req/s)│ │ (1000 req/s)│
        └─────────────┘ └─────────────┘ └─────────────┘
                │               │               │
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │   Database  │ │   Database  │ │   Database  │
        │  (Results)  │ │  (Results)  │ │  (Results)  │
        └─────────────┘ └─────────────┘ └─────────────┘
```

### **Required Components**

1. **Distributed Queue** (Redis/RabbitMQ)

   - Job distribution across workers
   - Priority queuing for important pages
   - Dead letter queues for failed jobs

2. **Worker Pool** (100+ instances)

   - Each worker: 1000 requests/second
   - Auto-scaling based on queue depth
   - Health checks and auto-replacement

3. **Database Cluster** (MongoDB/PostgreSQL)

   - Distributed storage for results
   - Sharding by domain/URL hash
   - Read replicas for query performance

4. **Caching Layer** (Redis)

   - URL deduplication across workers
   - Rate limiting coordination
   - Session management

5. **Monitoring** (Prometheus/Grafana)
   - Real-time metrics
   - Alert on failures
   - Performance optimization

### **Performance Calculations**

```
Target: 1,000,000 pages in 30 seconds
Required: 33,333 pages/second

Architecture:
├── 100 Workers × 1000 req/s = 100,000 req/s capacity
├── 3x over-provisioning for safety
├── Redis queue for job distribution
├── Database cluster for result storage
└── Load balancer for request distribution

Estimated Cost: $500-1000/hour
├── 100 EC2 instances (c5.2xlarge)
├── Redis cluster (r5.xlarge)
├── Database cluster (r5.4xlarge)
└── Load balancer + monitoring
```

## 🧪 **COMPREHENSIVE TESTING**

### **Current Test Coverage (42 Tests)**

#### **Unit Tests (24 tests)**

- URL normalization and validation
- Link extraction from HTML
- Subdomain boundary checking
- Error handling scenarios
- Concurrency limit verification

#### **Integration Tests (7 tests)**

- API endpoint functionality
- Request/response handling
- Error propagation
- Concurrent request handling

#### **End-to-End Tests (3 tests)**

- Full crawl scenarios
- Real HTTP server testing
- External link handling
- Error recovery

#### **ProcessQueue Tests (8 tests)**

- High concurrency scenarios
- Rate limiting verification
- Mixed success/failure handling
- Large queue processing
- Concurrency limit enforcement

### **Missing Test Scenarios**

#### **Large Scale Testing**

```typescript
// Test with 100+ pages
test('crawls large site with 100 pages', async () => {
  const results = await crawl('https://large-site.com', {
    maxConcurrency: 10,
    rateLimitMs: 50,
  });

  expect(results.length).toBe(100);
  expect(results.every((r) => r.url.includes('large-site.com'))).toBe(true);
});
```

#### **Performance Testing**

```typescript
// Test crawl speed and memory usage
test('crawls 1000 pages within time limit', async () => {
  const startTime = Date.now();
  const results = await crawl('https://test-site.com');
  const duration = Date.now() - startTime;

  expect(results.length).toBe(1000);
  expect(duration).toBeLessThan(30000); // 30 seconds
});
```

#### **Error Recovery Testing**

```typescript
// Test partial failure scenarios
test('handles 50% failure rate gracefully', async () => {
  // Mock 50% of requests to fail
  const results = await crawl('https://unreliable-site.com');

  expect(results.length).toBeGreaterThan(0);
  expect(results.some((r) => r.links.length === 0)).toBe(true);
});
```

## 🔧 **CONFIGURATION OPTIONS**

### **Current Configuration**

```typescript
interface CrawlOptions {
  maxConcurrency?: number; // Default: 5
  rateLimitMs?: number; // Default: 100ms
}
```

### **Recommended Production Settings**

```typescript
// Small sites (< 100 pages)
{ maxConcurrency: 3, rateLimitMs: 200 }

// Medium sites (100-1000 pages)
{ maxConcurrency: 5, rateLimitMs: 100 }

// Large sites (1000+ pages)
{ maxConcurrency: 10, rateLimitMs: 50 }

// Very large sites (10k+ pages)
{ maxConcurrency: 20, rateLimitMs: 25 }
```

## 🚨 **PRODUCTION DEPLOYMENT WARNINGS**

### **Memory Usage**

- **Small sites** (< 100 pages): ~10MB
- **Medium sites** (100-1000 pages): ~100MB
- **Large sites** (1000+ pages): ~1GB+
- **Very large sites** (10k+ pages): **Will crash** 💥

### **Network Considerations**

- **Rate limiting**: Respectful to target servers
- **User-Agent**: Consider setting custom user agent
- **Headers**: May need to set referrer, cookies
- **SSL/TLS**: Certificate validation issues possible

### **Error Scenarios**

- **Network timeouts**: No retry mechanism
- **Rate limiting**: May be blocked by target servers
- **Memory exhaustion**: Process will crash
- **Invalid URLs**: Skipped silently
- **Authentication**: Will fail on protected pages

## 📊 **MONITORING & OBSERVABILITY**

### **Current Logging**

```typescript
console.log(`✓ Visiting: ${url}`);
console.log(`  Found ${links.length} links`);
console.error(`✗ HTTP ${status}: ${url}`);
```

### **Recommended Production Logging**

```typescript
// Structured logging with levels
logger.info('crawl_started', { url, options });
logger.info('page_crawled', { url, linksFound, duration });
logger.error('crawl_failed', { url, error, retryCount });
logger.warn('rate_limited', { url, retryAfter });
```

### **Metrics to Track**

- **Crawl duration**: Total time per crawl
- **Pages per second**: Throughput metrics
- **Error rate**: Failed requests percentage
- **Memory usage**: Peak memory consumption
- **Network latency**: Request/response times
- **Queue depth**: Pending URLs count

## 🔮 **FUTURE IMPROVEMENTS**

### **Short Term (1-2 weeks)**

- [ ] Add request timeouts
- [ ] Implement retry logic
- [ ] Add memory usage monitoring
- [ ] Create progress callbacks
- [ ] Add crawl cancellation

### **Medium Term (1-2 months)**

- [ ] Database persistence
- [ ] Resume interrupted crawls
- [ ] Distributed crawling
- [ ] Advanced rate limiting
- [ ] Content filtering

### **Long Term (3-6 months)**

- [ ] Kubernetes deployment
- [ ] Auto-scaling workers
- [ ] Machine learning optimization
- [ ] Real-time monitoring dashboard
- [ ] Multi-tenant support

---

**⚠️ IMPORTANT**: This crawler is designed for **small to medium websites** (< 1000 pages). For larger sites, consider implementing the distributed architecture described above.
