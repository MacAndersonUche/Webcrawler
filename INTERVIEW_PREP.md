# Interview Preparation Guide

## 🎯 Overview

This document helps you prepare for the 45-minute technical interview focused on your web crawler take-home task.

---

## 📋 1. Solution Walkthrough Structure

### **Opening (2-3 minutes)**

- Start with the high-level architecture: "I built a web crawler as a monorepo with two packages - an Express API server and a React web interface"
- Explain the core requirement: "The crawler visits all URLs on the same domain, printing each URL and its links"
- Mention it's a custom implementation (no frameworks like Scrapy)

### **Architecture Overview (3-4 minutes)**

```
┌─────────────────┐
│   React Web UI  │ (packages/web)
│  (localhost:3001)│
└────────┬────────┘
         │ POST /api/crawl
         ▼
┌─────────────────┐
│ Express API     │ (packages/api)
│ (localhost:3000)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Crawler Core   │ (crawler.ts)
│  - Queue-based  │
│  - Concurrent   │
│  - BFS traversal│
└─────────────────┘
```

**Key Points:**

- Monorepo structure keeps concerns separated
- API can be used standalone or via web UI
- Core crawler logic is isolated and testable

---

## 🧠 2. Design Decisions & Trade-offs

### **Decision 1: Language & Runtime**

**Why TypeScript/Node.js?**

- ✅ JavaScript ecosystem has excellent HTML parsing (JSDOM)
- ✅ Native async/await for concurrent operations
- ✅ Built-in `fetch` API (Node 18+)
- ✅ TypeScript provides type safety for URL handling
- ⚠️ Trade-off: Single-threaded event loop (concurrency, not parallelism)

**Alternative considered:** Python (BeautifulSoup, Scrapy) - but wanted to demonstrate Node.js skills

### **Decision 2: No Frameworks (Scrapy/Go-colly)**

**Why custom implementation?**

- ✅ Demonstrates understanding of core algorithms
- ✅ Full control over concurrency and rate limiting
- ✅ No external dependencies for crawling logic
- ⚠️ Trade-off: More code to maintain, but shows problem-solving skills

### **Decision 3: Breadth-First Search (BFS)**

**Why queue-based BFS?**

- ✅ Processes pages level by level (more predictable)
- ✅ Better for discovering all pages at similar depths
- ✅ Easier to implement concurrency control
- ⚠️ Trade-off vs DFS: Uses more memory (queue grows), but more structured

**Code Reference:** `packages/api/src/crawler.ts:153` - `while (queue.length > 0 || inProgress.size > 0)`

### **Decision 4: Concurrent Processing with Rate Limiting**

**Why 5 concurrent requests + 100ms delay?**

- ✅ Balance between speed and being respectful to servers
- ✅ `inProgress` Set prevents duplicate concurrent requests
- ✅ `Promise.allSettled` ensures one failure doesn't block others
- ⚠️ Trade-off: Configurable but defaults are conservative

**Code Reference:**

- Concurrency: `packages/api/src/crawler.ts:154-161`
- Rate limiting: `packages/api/src/crawler.ts:164-167`

### **Decision 5: URL Normalization**

**Why normalize URLs?**

- ✅ Removes trailing slashes (`/about` vs `/about/`)
- ✅ Strips fragments (`#section`)
- ✅ Prevents duplicate crawling
- ⚠️ Trade-off: Preserves query strings (might crawl same page with different params)

**Code Reference:** `packages/api/src/crawler.ts:8-22`

### **Decision 6: Strict Domain Matching (No Subdomains)**

**Why exact hostname match?**

- ✅ Follows requirement strictly
- ✅ Prevents crawling entire internet
- ✅ Simple implementation (`url.hostname === target.hostname`)
- ⚠️ Trade-off: Won't crawl `blog.example.com` if starting from `example.com`

**Code Reference:** `packages/api/src/crawler.ts:24-32`

### **Decision 7: Graceful Error Handling**

**Why catch and continue?**

- ✅ Network errors are common (timeouts, DNS failures)
- ✅ One bad URL shouldn't stop entire crawl
- ✅ Record failed URLs with empty link arrays
- ⚠️ Trade-off: No retry logic (might miss transient failures)

**Code Reference:** `packages/api/src/crawler.ts:132-134`

### **Decision 8: In-Memory Storage**

**Why no database/persistence?**

- ✅ Simplicity for take-home scope
- ✅ Fast (no I/O overhead)
- ✅ Sufficient for small-to-medium sites
- ⚠️ Trade-off: Can't resume interrupted crawls, memory limits

---

## 🔄 3. How to Iterate on the Solution

### **Scenario 1: "Scale to millions of pages"**

**Current Limitation:**

- All URLs in memory (`Set<string>`)
- Queue grows unbounded
- No persistence

**Iteration Plan:**

1. **Distributed Queue (Redis/BullMQ)**

   - Move URL queue to Redis
   - Multiple workers can process from same queue
   - Horizontal scaling

2. **Database for Deduplication**

   - Use Bloom filter or Redis Set for visited URLs
   - Periodic cleanup of old entries
   - Reduces memory footprint

3. **Worker Pool Architecture**

   - Master node coordinates
   - Worker nodes fetch and parse
   - Results stored in database (PostgreSQL/MongoDB)

4. **Resumable Crawls**
   - Store crawl state (queue, visited, in-progress)
   - Checkpoint periodically
   - Resume from last checkpoint on restart

**Code Changes:**

```typescript
// Replace in-memory queue with Redis
import { Queue } from 'bullmq';
const urlQueue = new Queue('crawler-urls', { connection: redis });

// Replace Set with Redis Set
const visited = new RedisSet('visited-urls');
```

---

### **Scenario 2: "Handle JavaScript-rendered content"**

**Current Limitation:**

- Only parses static HTML
- No JavaScript execution

**Iteration Plan:**

1. **Headless Browser (Puppeteer/Playwright)**

   - Execute JavaScript before parsing
   - Wait for dynamic content to load
   - Handle SPAs (Single Page Applications)

2. **Hybrid Approach**

   - Try static parsing first (faster)
   - Fall back to browser if content is missing
   - Cache detection results

3. **Performance Considerations**
   - Browser instances are resource-heavy
   - Use browser pool (reuse instances)
   - Limit concurrent browser instances separately

**Code Changes:**

```typescript
async function fetchPage(
  url: string,
  useBrowser: boolean = false
): Promise<string | null> {
  if (useBrowser) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    await browser.close();
    return html;
  }
  // Existing fetch logic...
}
```

---

### **Scenario 3: "Respect robots.txt"**

**Current Limitation:**

- No robots.txt checking
- Might crawl disallowed paths

**Iteration Plan:**

1. **Fetch and Parse robots.txt**

   - Fetch `robots.txt` before crawling
   - Parse with library like `robots-parser`
   - Check each URL against rules

2. **Caching**

   - Cache robots.txt per domain
   - Respect crawl-delay directives
   - Update periodically

3. **User-Agent**
   - Set identifiable user-agent
   - Some sites require specific agents

**Code Changes:**

```typescript
import { RobotsParser } from 'robots-parser';

async function checkRobotsTxt(url: string): Promise<boolean> {
  const robotsUrl = new URL('/robots.txt', url).href;
  const robotsTxt = await fetch(robotsUrl).then((r) => r.text());
  const robots = RobotsParser(robotsUrl, robotsTxt);
  return robots.isAllowed(url, 'MyCrawler/1.0');
}
```

---

### **Scenario 4: "Add request timeouts and retries"**

**Current Limitation:**

- No timeouts (requests can hang)
- No retry logic

**Iteration Plan:**

1. **Timeout Wrapper**

   - Wrap fetch with AbortController
   - Default timeout (e.g., 30 seconds)
   - Configurable per request

2. **Exponential Backoff Retry**

   - Retry failed requests (3 attempts)
   - Exponential delay (1s, 2s, 4s)
   - Only retry on network errors, not 404s

3. **Circuit Breaker**
   - Stop retrying if domain consistently fails
   - Resume after cooldown period

**Code Changes:**

```typescript
async function fetchPageWithTimeout(
  url: string,
  timeoutMs: number = 30000
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    // ... existing logic
  } catch (error) {
    clearTimeout(timeoutId);
    // Retry logic here
  }
}
```

---

### **Scenario 5: "Support authentication"**

**Current Limitation:**

- Only public pages
- No session management

**Iteration Plan:**

1. **Cookie/Session Support**

   - Accept cookies from login requests
   - Maintain session per domain
   - Pass cookies in subsequent requests

2. **OAuth/Token Auth**
   - Accept bearer tokens
   - Refresh tokens if expired
   - Store credentials securely

**Code Changes:**

```typescript
const cookieJar = new Map<string, string>();

async function fetchPage(url: string): Promise<string | null> {
  const domain = new URL(url).hostname;
  const cookies = cookieJar.get(domain) || '';

  const response = await fetch(url, {
    headers: { Cookie: cookies },
  });

  // Extract and store cookies from response
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookieJar.set(domain, setCookie);

  // ... rest of logic
}
```

---

## 💬 4. Key Talking Points

### **Strengths to Highlight**

1. **Clean Architecture**: Separation of concerns (API, web UI, core logic)
2. **Comprehensive Testing**: Unit tests, integration tests, E2E tests
3. **Error Resilience**: `Promise.allSettled`, graceful error handling
4. **Concurrency Control**: Proper handling with `inProgress` Set
5. **Documentation**: Clear README with limitations and assumptions

### **Honest About Limitations**

1. **Memory-bound**: Won't scale to very large sites (>10k pages)
2. **No JavaScript execution**: Only static HTML
3. **No persistence**: Can't resume interrupted crawls
4. **No retries**: Transient failures are permanent
5. **No timeouts**: Requests can hang indefinitely

### **Testing Approach**

- **Unit Tests**: Core functions (normalizeURL, isSameSubdomain, getLinksFromHTML)
- **Integration Tests**: API endpoint with mocked crawler
- **E2E Tests**: Real HTTP server with known structure
- **Edge Cases**: Duplicate URLs, network errors, HTTP failures, concurrency limits

**Test File Reference:** `packages/api/src/__tests__/crawler.test.ts` (483 lines, comprehensive coverage)

---

## 🎬 5. Demo Flow (If Asked to Show)

### **Pre-demo Setup**

1. Have both servers running: `npm run start:all`
2. Have browser open to `http://localhost:3001`
3. Be ready to show:
   - Web UI (React component)
   - API endpoint (Express server)
   - Core crawler code (`crawler.ts`)
   - Test files

### **Demo Script**

1. **Show Web UI** (30 seconds)

   - Enter a URL (e.g., `https://example.com`)
   - Click "Start Crawling"
   - Show results appearing

2. **Show API Code** (1-2 minutes)

   - Open `packages/api/src/index.ts`
   - Explain POST endpoint
   - Show error handling

3. **Show Core Crawler** (2-3 minutes)

   - Open `packages/api/src/crawler.ts`
   - Walk through `crawl()` function
   - Explain `processQueue()` concurrency logic
   - Highlight `normalizeURL()` and `isSameSubdomain()`

4. **Show Tests** (1 minute)
   - Open test file
   - Highlight key test cases (concurrency, error handling)

---

## 🤔 6. Reflection Questions (Be Ready to Answer)

### **"What worked well?"**

- ✅ TypeScript's type safety caught URL handling bugs early
- ✅ JSDOM made HTML parsing straightforward
- ✅ `Promise.allSettled` simplified error handling
- ✅ Monorepo structure kept code organized

### **"What would you do differently?"**

- 🔄 Add request timeouts from the start
- 🔄 Use a more sophisticated queue (e.g., priority queue for important pages)
- 🔄 Consider using a library for URL normalization (edge cases)
- 🔄 Add metrics/logging (pages crawled, time taken, errors)

### **"How did you approach testing?"**

- Started with unit tests for pure functions
- Added integration tests for API
- Created E2E tests with real HTTP server
- Focused on edge cases (concurrency, errors, duplicates)

### **"How would you monitor this in production?"**

- Metrics: pages crawled/second, error rate, queue size
- Logging: failed URLs, timeout URLs, rate limit violations
- Alerts: if crawl fails completely, if error rate > threshold
- Dashboard: real-time crawl progress, historical data

---

## 📝 7. Quick Reference: Code Locations

| Topic               | File                                         | Key Lines |
| ------------------- | -------------------------------------------- | --------- |
| Main crawl function | `packages/api/src/crawler.ts`                | 171-185   |
| Concurrency control | `packages/api/src/crawler.ts`                | 144-169   |
| URL normalization   | `packages/api/src/crawler.ts`                | 8-22      |
| Domain matching     | `packages/api/src/crawler.ts`                | 24-32     |
| Link extraction     | `packages/api/src/crawler.ts`                | 34-58     |
| API endpoint        | `packages/api/src/index.ts`                  | 9-43      |
| Web UI              | `packages/web/src/App.tsx`                   | 8-114     |
| Tests               | `packages/api/src/__tests__/crawler.test.ts` | All       |

---

## ✅ 8. Pre-Interview Checklist

- [ ] Review README.md (know your assumptions)
- [ ] Run the code once to ensure it works
- [ ] Open key files in your editor (ready to share screen)
- [ ] Review test file (understand test coverage)
- [ ] Think about at least 2-3 iteration scenarios
- [ ] Prepare answers to "what worked well" and "what would you do differently"
- [ ] Test screen sharing in Google Meet (if possible)
- [ ] Ensure stable internet connection
- [ ] Have a quiet environment set up

---

## 🎯 9. Closing Thoughts

Remember:

- **They've already reviewed your code** - they're interested in your thought process
- **Be honest about limitations** - shows self-awareness
- **Show enthusiasm** - explain why you made certain choices
- **Think out loud** - if asked to iterate, talk through your reasoning

Good luck! 🚀
