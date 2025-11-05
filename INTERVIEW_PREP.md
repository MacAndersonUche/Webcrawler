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

## 🔍 2.5. Step-by-Step Crawler Logic Explanation

Understanding the execution flow in `crawler.ts`:

### **Entry Point: `crawl()` Function (Lines 171-185)**

```typescript
export async function crawl(
  startURL: string,
  options = {}
): Promise<CrawlResult[]>;
```

**Step-by-step execution:**

1. **Initialize Data Structures:**

   - `results: CrawlResult[]` - Array to store all crawled pages and their links
   - `visited: Set<string>` - Tracks URLs that have been fully processed
   - `queue: string[]` - FIFO queue for BFS traversal (starts with `startURL`)
   - `inProgress: Set<string>` - Tracks URLs currently being fetched (prevents duplicates)

2. **Set Defaults:**

   - `maxConcurrency = 5` - Maximum parallel requests
   - `rateLimitMs = 100` - Delay between request batches

3. **Start Processing:**
   - Calls `processQueue()` with all initialized structures
   - Returns results array when complete

---

### **Core Loop: `processQueue()` Function (Lines 144-169)**

```typescript
async function processQueue(...): Promise<void>
```

**Main loop logic:**

```typescript
while (queue.length > 0 || inProgress.size > 0)
```

**Why this condition?**

- `queue.length > 0` - More URLs to process
- `inProgress.size > 0` - Still waiting for ongoing requests to complete
- Both must be empty to exit (ensures all started requests finish)

**Each iteration:**

1. **Calculate Available Slots:**

   ```typescript
   const availableSlots = maxConcurrency - inProgress.size;
   ```

   - If 5 concurrent max, and 3 in progress → 2 available slots

2. **Extract URLs to Process:**

   ```typescript
   const urlsToProcess = queue.splice(0, availableSlots);
   ```

   - Removes up to `availableSlots` URLs from queue (FIFO)
   - `splice()` mutates the array (removes from front)

3. **Process URLs Concurrently:**

   ```typescript
   const promises = urlsToProcess.map(url => processURL(...));
   await Promise.allSettled(promises);
   ```

   - Creates promise for each URL
   - `Promise.allSettled()` waits for all (success or failure)
   - **Key:** One failure doesn't block others

4. **Rate Limiting:**

   ```typescript
   if (queue.length > 0 || inProgress.size > 0) {
     await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
   }
   ```

   - Waits 100ms before next batch (only if more work exists)
   - Prevents overwhelming the server

---

### **URL Processing: `processURL()` Function (Lines 84-139)**

```typescript
async function processURL(
  url,
  startURL,
  results,
  visited,
  inProgress,
  queue
): Promise<void>;
```

**Step-by-step execution:**

1. **Normalize URL:**

   ```typescript
   const normalizedURL = normalizeURL(url);
   ```

   - Removes trailing slashes, fragments
   - Ensures consistent URL format

2. **Early Exit Checks:**

   ```typescript
   if (visited.has(normalizedURL) || inProgress.has(normalizedURL)) {
     return; // Already processed or currently being processed
   }
   ```

   - **Why `inProgress` check?** Prevents duplicate concurrent requests
   - Example: Page A and Page B both link to Page C → only one request

3. **Domain Validation:**

   ```typescript
   if (!isSameSubdomain(startURL, url)) {
     return; // Skip external domains
   }
   ```

4. **Mark as In-Progress:**

   ```typescript
   inProgress.add(normalizedURL);
   ```

   - Prevents other concurrent requests from processing same URL

5. **Fetch Page:**

   ```typescript
   const html = await fetchPage(url);
   ```

   - Calls `fetchPage()` (handles HTTP errors, content-type checks)
   - Returns `null` on failure (network error, 404, non-HTML)

6. **Handle Fetch Failure:**

   ```typescript
   if (!html) {
     results.push({ url: normalizedURL, links: [] });
     return; // Record failed URL with empty links
   }
   ```

   - Still records the URL (for completeness)
   - Empty links array indicates failure

7. **Extract Links:**

   ```typescript
   const links = getLinksFromHTML(html, url);
   const normalizedLinks = [
     ...new Set(links.map((link) => normalizeURL(link))),
   ];
   ```

   - Gets all `<a href>` links
   - Normalizes each link
   - Removes duplicates with `Set`

8. **Record Results:**

   ```typescript
   results.push({ url: normalizedURL, links: normalizedLinks });
   ```

9. **Add New Links to Queue:**

   ```typescript
   for (const link of links) {
     const normalizedLink = normalizeURL(link);
     if (
       isSameSubdomain(startURL, link) &&
       !visited.has(normalizedLink) &&
       !inProgress.has(normalizedLink)
     ) {
       queue.push(link);
     }
   }
   ```

   - Checks domain match
   - Skips already visited or in-progress URLs
   - Adds to queue for BFS traversal

10. **Cleanup (finally block):**

    ```typescript
    finally {
      visited.add(normalizedURL);
      inProgress.delete(normalizedURL);
    }
    ```

    - Always marks as visited (even on error)
    - Removes from in-progress set
    - Ensures cleanup happens

---

### **Helper Functions:**

#### **`normalizeURL()` (Lines 8-22)**

- Removes trailing slashes (`/about/` → `/about`)
- Strips fragments (`#section`)
- Preserves query strings (`?key=value`)
- Returns normalized URL string

#### **`isSameSubdomain()` (Lines 24-32)**

- Compares `url.hostname` (exact match)
- Returns `false` for invalid URLs
- **Strict:** `example.com` ≠ `blog.example.com`

#### **`getLinksFromHTML()` (Lines 34-58)**

- Parses HTML with JSDOM
- Finds all `<a>` tags
- Converts relative URLs to absolute using `new URL(href, baseURL)`
- Filters out non-HTTP/HTTPS protocols (`javascript:`, `mailto:`, etc.)
- Returns array of absolute URLs

#### **`fetchPage()` (Lines 60-79)**

- Fetches URL with `fetch()`
- Checks HTTP status (`response.ok`)
- Validates content-type (`text/html` only)
- Returns HTML string or `null` on failure
- Logs errors but doesn't throw

---

### **Execution Flow Example:**

**Starting with:** `https://example.com`

1. **Initial State:**

   - `queue = ['https://example.com']`
   - `visited = {}`
   - `inProgress = {}`

2. **First Iteration:**

   - `processQueue()` starts
   - `availableSlots = 5 - 0 = 5`
   - `urlsToProcess = ['https://example.com']`
   - Calls `processURL('https://example.com', ...)`

3. **Processing example.com:**

   - Normalizes: `https://example.com`
   - Checks: not visited, not in-progress, same domain ✓
   - Adds to `inProgress`
   - Fetches page → gets HTML
   - Extracts links: `['/about', '/contact', 'https://external.com']`
   - Records result: `{ url: 'https://example.com', links: [...] }`
   - Filters links:
     - `/about` → same domain, not visited → add to queue
     - `/contact` → same domain, not visited → add to queue
     - `https://external.com` → different domain → skip
   - Cleanup: `visited.add()`, `inProgress.delete()`

4. **Next Iteration:**

   - `queue = ['/about', '/contact']`
   - `availableSlots = 5 - 0 = 5`
   - Processes both URLs concurrently
   - Each extracts more links, adds to queue
   - Continues until queue empty and all requests complete

5. **Termination:**
   - `queue.length === 0` (no more URLs)
   - `inProgress.size === 0` (all requests done)
   - Loop exits, returns results

---

### **Key Design Patterns:**

1. **BFS Traversal:** Queue ensures level-by-level processing
2. **Concurrency Control:** `inProgress` Set prevents race conditions
3. **Graceful Degradation:** `Promise.allSettled()` ensures failures don't block
4. **Early Exit:** Multiple checks prevent unnecessary work
5. **Immutable Results:** Results array only grows (never modified)

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

## ❓ 7. Possible Interview Questions & Answers

### **Technical Deep-Dive Questions**

#### **Q: "Why did you use `Promise.allSettled` instead of `Promise.all`?"**

**Answer:**

- `Promise.all` fails fast - if one request fails, all others are canceled
- `Promise.allSettled` waits for all promises to complete (success or failure)
- In a crawler, one bad URL shouldn't stop the entire crawl
- We want to record all results, even if some pages fail
- This ensures maximum coverage and graceful error handling

**Code Reference:** `packages/api/src/crawler.ts:161`

---

#### **Q: "Explain the `inProgress` Set. Why do you need it?"**

**Answer:**

- Prevents race conditions when multiple pages link to the same URL
- Example: Page A and Page B both link to Page C
- Without `inProgress`: Both might start fetching Page C simultaneously
- With `inProgress`: First request marks it, second sees it and skips
- Also ensures we don't exceed `maxConcurrency` limits
- Cleaned up in `finally` block to ensure it's always removed

**Code Reference:** `packages/api/src/crawler.ts:94, 103, 137`

---

#### **Q: "Why check `inProgress` when adding to queue, not just `visited`?"**

**Answer:**

- A URL might be currently fetching but not yet in `visited`
- If we only check `visited`, we'd add the same URL to queue multiple times
- `inProgress` prevents duplicate queue entries
- Reduces queue bloat and unnecessary work
- Example: 10 pages all link to same URL → only 1 queue entry, not 10

**Code Reference:** `packages/api/src/crawler.ts:127-128`

---

#### **Q: "Why normalize URLs twice? Once in `processURL` and once when adding to queue?"**

**Answer:**

- First normalization (line 92): Ensures consistent format for duplicate checking
- Second normalization (line 125): Normalizes extracted links before comparing
- Links from HTML might be in different formats (`/about`, `/about/`, `/about#section`)
- Normalizing ensures we catch duplicates regardless of format
- Also normalizes again when checking queue (line 127) to match stored format

**Code Reference:** `packages/api/src/crawler.ts:92, 115, 125`

---

#### **Q: "What happens if the queue grows very large? Memory concerns?"**

**Answer:**

- Yes, this is a limitation - the queue is unbounded in memory
- For large sites (>10k pages), queue could grow to thousands of URLs
- Each URL is a string, so memory usage is manageable but not infinite
- In production, would move to Redis queue or database-backed queue
- Current implementation prioritizes simplicity for take-home scope

**Mitigation if asked:** Could add max queue size limit, but that risks incomplete crawls

---

#### **Q: "Why use `queue.splice(0, availableSlots)` instead of `shift()` in a loop?"**

**Answer:**

- `splice()` extracts multiple items in one operation (O(n) where n = items removed)
- `shift()` in loop would be O(n) per item (O(n²) total)
- `splice()` is more efficient for batch operations
- Also atomic - removes items before any async work starts
- Prevents race conditions if multiple promises were modifying queue

**Code Reference:** `packages/api/src/crawler.ts:155`

---

#### **Q: "Why check domain match in `processURL` AND when adding to queue?"**

**Answer:**

- First check (line 99): Early exit if URL is already known to be external
- Second check (line 126): Filters links before adding to queue
- Reduces queue size by not adding external URLs
- But we still check in `processURL` as defense in depth
- Also handles edge case where URL might be added directly (future API changes)

**Code Reference:** `packages/api/src/crawler.ts:99, 126`

---

#### **Q: "Why does `processQueue` loop condition check both queue AND inProgress?"**

**Answer:**

- `queue.length > 0`: More URLs to process
- `inProgress.size > 0`: Still waiting for ongoing requests
- If we only checked queue, we'd exit while requests are still in-flight
- Example: Queue empty, but 3 requests still fetching → loop must continue
- Ensures all started requests complete before returning

**Code Reference:** `packages/api/src/crawler.ts:153`

---

### **Algorithm & Design Questions**

#### **Q: "Why BFS instead of DFS?"**

**Answer:**

- BFS processes pages level by level (more predictable)
- Better for discovering all pages at similar depths
- Easier to implement concurrency control (process N pages per level)
- DFS would go deep first, might miss breadth of site structure
- BFS queue naturally supports concurrent processing

**Trade-off:** Uses more memory (queue grows), but more structured

---

#### **Q: "How would you handle infinite loops or circular references?"**

**Answer:**

- Current implementation: `visited` Set prevents revisiting URLs
- Once a URL is processed, it's never processed again
- Normalization ensures `/about` and `/about/` are treated as same URL
- Circular references naturally break because visited URLs are skipped
- Example: Page A → Page B → Page A → Page B stops at second visit

**Code Reference:** `packages/api/src/crawler.ts:94` - visited check

---

#### **Q: "What if two pages link to the same URL with different query params?"**

**Answer:**

- Current implementation preserves query strings in normalization
- `/page?sort=asc` and `/page?sort=desc` are treated as different URLs
- This might crawl the same logical page twice
- Trade-off: Could normalize query strings, but loses information
- For take-home, preserving query strings is safer (more conservative)

**Code Reference:** `packages/api/src/crawler.ts:18` - preserves `url.search`

---

#### **Q: "How would you prioritize which URLs to crawl first?"**

**Answer:**

- Current: FIFO queue (first-come, first-served)
- Could use priority queue:
  - Homepage links first (higher priority)
  - Sitemap URLs first
  - Based on link depth (shallow first)
  - Based on page importance (SEO signals)
- Implementation: Replace array with heap-based priority queue
- Trade-off: More complex, but better crawl order

---

### **Concurrency & Performance Questions**

#### **Q: "Why default to 5 concurrent requests? How did you choose this?"**

**Answer:**

- Balance between speed and being respectful to servers
- Too high: Risk rate limiting, IP blocking, server overload
- Too low: Crawl takes too long
- 5 is conservative default - safe for most servers
- Configurable via options for different use cases
- Could be made adaptive based on server response times

**Code Reference:** `packages/api/src/crawler.ts:175`

---

#### **Q: "What happens if a request hangs indefinitely?"**

**Answer:**

- Current limitation: No timeout, request could hang forever
- Would block that concurrency slot until it completes
- Could cause deadlock if all slots are hung
- Solution: Add `AbortController` with timeout (30s default)
- Would need to implement in `fetchPage()` function

**Improvement:** Add timeout wrapper around fetch

---

#### **Q: "How does rate limiting work? Is it per-request or per-batch?"**

**Answer:**

- Per-batch: 100ms delay between batches
- Not per-request (would be 100ms × 5 requests = slower)
- After processing a batch, waits 100ms before next batch
- Only waits if more work exists (queue or in-progress)
- Could be improved to per-domain rate limiting (respect multiple domains)

**Code Reference:** `packages/api/src/crawler.ts:165-167`

---

### **Error Handling Questions**

#### **Q: "Why record failed URLs with empty links instead of skipping them?"**

**Answer:**

- Provides complete audit trail of crawl attempt
- Distinguishes "no links found" from "failed to fetch"
- Helps debug issues (which URLs failed? Why?)
- Allows caller to know what was attempted
- Empty links array is explicit signal of failure

**Code Reference:** `packages/api/src/crawler.ts:110, 134`

---

#### **Q: "What types of errors can occur, and how are they handled?"**

**Answer:**

1. **Network errors** (DNS failure, timeout) → `fetchPage()` catches, returns null
2. **HTTP errors** (404, 500) → Checked with `response.ok`, returns null
3. **Non-HTML content** → Content-type check, returns null
4. **Invalid URLs** → `normalizeURL()` throws, caught in `processURL` catch block
5. **Parsing errors** → `getLinksFromHTML()` continues on error, returns empty array

All errors are logged but don't stop the crawl.

**Code Reference:** `packages/api/src/crawler.ts:60-79, 132-134`

---

#### **Q: "Why not retry failed requests?"**

**Answer:**

- Current: No retry logic (failed requests are permanent)
- Trade-off: Simplicity vs. resilience
- Retries would add complexity:
  - Exponential backoff logic
  - Distinguish retryable errors (network) from non-retryable (404)
  - Circuit breaker for consistently failing domains
- For take-home, keeping it simple was priority
- Would add in production version

---

### **Testing & Quality Questions**

#### **Q: "How did you test the concurrency behavior?"**

**Answer:**

- Unit tests mock fetch and verify concurrent calls
- Test checks that max concurrency is never exceeded
- Test verifies `inProgress` prevents duplicates
- E2E tests with real HTTP server
- Edge cases: concurrent failures, mixed success/failure

**Code Reference:** `packages/api/src/__tests__/crawler.test.ts:424-454`

---

#### **Q: "What edge cases did you consider?"**

**Answer:**

1. **Duplicate URLs** → Normalization + visited Set
2. **Circular references** → Visited Set prevents loops
3. **Concurrent duplicates** → `inProgress` Set
4. **Relative vs absolute URLs** → `new URL(href, baseURL)`
5. **Invalid URLs** → Try-catch in normalization
6. **Network failures** → `Promise.allSettled`, graceful handling
7. **Non-HTML content** → Content-type filtering
8. **External domains** → Domain matching check

---

### **Architecture Questions**

#### **Q: "Why separate API and Web UI packages?"**

**Answer:**

- Separation of concerns: API can be used standalone
- Web UI is just a client - could be replaced with CLI, mobile app, etc.
- API package is testable independently
- Allows different deployment strategies
- Monorepo keeps related code together but separated

---

#### **Q: "Why not use a framework like Scrapy?"**

**Answer:**

- Demonstrates understanding of core algorithms
- Full control over concurrency and rate limiting
- Shows problem-solving skills vs. framework knowledge
- No external dependencies for core logic
- Trade-off: More code, but shows depth of understanding

---

### **Production & Scalability Questions**

#### **Q: "How would you make this production-ready?"**

**Answer:**

1. **Add timeouts** - AbortController with configurable timeout
2. **Retry logic** - Exponential backoff for transient failures
3. **Persistence** - Redis queue, database for results
4. **Monitoring** - Metrics, logging, alerts
5. **robots.txt** - Respect crawl rules
6. **Rate limiting** - Per-domain, adaptive
7. **Distributed** - Worker pool, shared state
8. **Resumable** - Checkpoint system

---

#### **Q: "What's the bottleneck in this implementation?"**

**Answer:**

- **Memory**: Queue and visited Set grow unbounded
- **Single process**: Can't scale horizontally
- **No timeouts**: Hanging requests block slots
- **Network I/O**: Limited by server response times
- **No persistence**: Can't resume interrupted crawls

**Biggest bottleneck:** Memory for large sites

---

### **Hypothetical Scenario Questions**

#### **Q: "A site has 100,000 pages. What happens?"**

**Answer:**

- Queue would grow to ~100k URLs in memory
- Each URL string ~50-100 bytes → ~5-10MB for queue
- Visited Set similar size → ~10-20MB total
- Node.js can handle this, but close to limits
- Better approach: Stream to database, use Bloom filter for visited

---

#### **Q: "What if a site blocks your requests after 10 pages?"**

**Answer:**

- Current: Would record 10 successful, rest would fail
- No retry logic, so failures are permanent
- No detection of rate limiting patterns
- Improvement: Detect 429 responses, implement backoff
- Circuit breaker to pause crawling if domain consistently fails

---

#### **Q: "How would you crawl a site that requires authentication?"**

**Answer:**

- Current: Can't - only public pages
- Would need:
  - Cookie jar per domain
  - Login flow (POST to login endpoint)
  - Session management
  - Pass cookies in subsequent requests
- Could accept credentials as options parameter
- Store session securely

---

## 📝 8. Quick Reference: Code Locations

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

## ✅ 9. Pre-Interview Checklist

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

## 🎯 10. Closing Thoughts

Remember:

- **They've already reviewed your code** - they're interested in your thought process
- **Be honest about limitations** - shows self-awareness
- **Show enthusiasm** - explain why you made certain choices
- **Think out loud** - if asked to iterate, talk through your reasoning

Good luck! 🚀
