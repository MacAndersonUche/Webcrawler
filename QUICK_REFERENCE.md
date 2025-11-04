# Quick Reference Cheat Sheet

## 🚀 One-Minute Elevator Pitch

"I built a web crawler in TypeScript/Node.js that uses a queue-based BFS algorithm with concurrent processing. It's structured as a monorepo with an Express API and React web UI. The core features include URL normalization, strict domain matching, rate limiting, and graceful error handling. I chose not to use frameworks like Scrapy to demonstrate understanding of the core algorithms."

---

## 🎯 Key Design Decisions (30-second answers)

| Decision | Why | Trade-off |
|----------|-----|-----------|
| **TypeScript/Node.js** | Native async/await, JSDOM for parsing, built-in fetch | Single-threaded (concurrency, not parallelism) |
| **Custom implementation** | Shows problem-solving, full control | More code vs. using framework |
| **BFS (queue-based)** | Processes level by level, predictable | Uses more memory than DFS |
| **5 concurrent + 100ms** | Balance speed vs. server respect | Conservative defaults |
| **In-memory storage** | Simplicity, fast | Can't resume, memory limits |
| **Strict domain match** | Follows requirement, prevents infinite crawl | No subdomains |

---

## 🔄 Iteration Scenarios (Quick Answers)

### **"Scale to millions of pages"**
→ Redis queue, database for deduplication, worker pool, resumable crawls with checkpoints

### **"Handle JavaScript content"**
→ Puppeteer/Playwright for headless browser, hybrid approach (static first, browser fallback)

### **"Respect robots.txt"**
→ Fetch and parse robots.txt, cache per domain, check each URL before crawling

### **"Add timeouts/retries"**
→ AbortController for timeouts, exponential backoff retry (3 attempts), circuit breaker

### **"Support authentication"**
→ Cookie jar per domain, session management, bearer token support

---

## 💡 Key Strengths (Highlight These)

1. ✅ Clean architecture (monorepo, separation of concerns)
2. ✅ Comprehensive testing (unit, integration, E2E)
3. ✅ Error resilience (`Promise.allSettled`, graceful handling)
4. ✅ Proper concurrency control (`inProgress` Set)
5. ✅ Well-documented (README with limitations)

---

## ⚠️ Known Limitations (Be Honest)

1. Memory-bound (won't scale to >10k pages)
2. No JavaScript execution (static HTML only)
3. No persistence (can't resume crawls)
4. No retries (transient failures are permanent)
5. No timeouts (requests can hang)

---

## 📍 Code Quick Navigation

- **Main crawl**: `packages/api/src/crawler.ts:171-185`
- **Concurrency**: `packages/api/src/crawler.ts:144-169`
- **URL normalization**: `packages/api/src/crawler.ts:8-22`
- **Domain matching**: `packages/api/src/crawler.ts:24-32`
- **API endpoint**: `packages/api/src/index.ts:9-43`
- **Tests**: `packages/api/src/__tests__/crawler.test.ts`

---

## 🤔 Reflection Answers (Prepared)

**"What worked well?"**
- TypeScript caught bugs early
- JSDOM simplified HTML parsing
- `Promise.allSettled` made error handling easy
- Monorepo kept code organized

**"What would you do differently?"**
- Add timeouts from the start
- Use priority queue for important pages
- Add metrics/logging
- Consider URL normalization library

---

## 🎬 Demo Script (If Asked)

1. Show web UI → Enter URL → Start crawl
2. Show API code → Explain endpoint
3. Show crawler.ts → Walk through core logic
4. Show tests → Highlight coverage

---

## 📊 Architecture Diagram (Quick Draw)

```
React UI (port 3001)
    ↓ POST /api/crawl
Express API (port 3000)
    ↓ calls crawl()
Crawler Core
    ├─ Queue (BFS)
    ├─ Concurrent processing (5 max)
    ├─ Rate limiting (100ms)
    └─ Error handling (Promise.allSettled)
```

---

## 🎯 Remember

- **They've reviewed your code** → Focus on thought process
- **Be honest about limitations** → Shows self-awareness
- **Think out loud** → Explain reasoning
- **Show enthusiasm** → You're proud of this work!

