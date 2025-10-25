import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { crawl, CrawlResult } from './crawler.js';

/**
 * Stream-based crawler for memory-efficient processing of large sites
 */
export class OptimizedCrawler {
  private maxConcurrency: number;
  private rateLimitMs: number;
  private maxPages: number;

  constructor(options: { maxConcurrency?: number; rateLimitMs?: number; maxPages?: number } = {}) {
    this.maxConcurrency = options.maxConcurrency || 10;
    this.rateLimitMs = options.rateLimitMs || 50;
    this.maxPages = options.maxPages || 5000;
  }

  /**
   * Stream-based crawling that processes results as they come in
   */
  async crawlStream(startURL: string): Promise<Readable> {
    const results: CrawlResult[] = [];
    const visited = new Set<string>();
    const queue: string[] = [startURL];
    const inProgress = new Set<string>();
    let processedCount = 0;

    // Create a readable stream that yields results
    const resultStream = new Readable({
      objectMode: true,
      read() {
        // Stream will be controlled by the processing logic
      }
    });

    // Process URLs in batches
    const processBatch = async () => {
      while (queue.length > 0 && inProgress.size < this.maxConcurrency && processedCount < this.maxPages) {
        const availableSlots = this.maxConcurrency - inProgress.size;
        const urlsToProcess = queue.splice(0, availableSlots);

        // Process URLs concurrently
        const promises = urlsToProcess.map(url => this.processURL(url, resultStream, queue, visited, inProgress));
        await Promise.allSettled(promises);

        // Rate limiting
        if (queue.length > 0 || inProgress.size > 0) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitMs));
        }
      }

      // End stream when done
      if (queue.length === 0 && inProgress.size === 0) {
        resultStream.push(null);
      }
    };

    // Start processing
    processBatch().catch(error => {
      resultStream.destroy(error);
    });

    return resultStream;
  }

  private async processURL(
    url: string, 
    resultStream: Readable, 
    queue: string[], 
    visited: Set<string>, 
    inProgress: Set<string>
  ) {
    const normalizedURL = this.normalizeURL(url);
    
    if (visited.has(normalizedURL) || inProgress.has(normalizedURL)) {
      return;
    }

    inProgress.add(normalizedURL);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebCrawler/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) return;

      const html = await response.text();
      const links = this.extractLinks(html, url);
      
      const result: CrawlResult = {
        url: normalizedURL,
        links: links.map(link => this.normalizeURL(link))
      };

      // Stream the result immediately
      resultStream.push(result);

      // Add new links to queue
      for (const link of links) {
        const normalizedLink = this.normalizeURL(link);
        if (this.isSameSubdomain(url, link) && 
            !visited.has(normalizedLink) && 
            !inProgress.has(normalizedLink)) {
          queue.push(link);
        }
      }

    } catch (error) {
      console.error(`Error processing ${url}:`, error);
    } finally {
      visited.add(normalizedURL);
      inProgress.delete(normalizedURL);
    }
  }

  private normalizeURL(urlString: string): string {
    try {
      const url = new URL(urlString);
      let path = url.pathname;
      if (path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return `${url.protocol}//${url.hostname}${path}${url.search}`;
    } catch (error) {
      throw new Error(`Invalid URL: ${urlString}`);
    }
  }

  private isSameSubdomain(baseURL: string, targetURL: string): boolean {
    try {
      const base = new URL(baseURL);
      const target = new URL(targetURL);
      return base.hostname === target.hostname;
    } catch (error) {
      return false;
    }
  }

  private extractLinks(html: string, baseURL: string): string[] {
    const links: string[] = [];
    const linkRegex = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        continue;
      }

      try {
        const absoluteURL = new URL(href, baseURL);
        if (absoluteURL.protocol === 'http:' || absoluteURL.protocol === 'https:') {
          links.push(absoluteURL.href);
        }
      } catch (error) {
        continue;
      }
    }

    return links;
  }
}

/**
 * Batch processing with memory management
 */
export class BatchCrawler {
  private batchSize: number;
  private maxConcurrency: number;

  constructor(batchSize: number = 100, maxConcurrency: number = 5) {
    this.batchSize = batchSize;
    this.maxConcurrency = maxConcurrency;
  }

  async crawlInBatches(startURL: string): Promise<CrawlResult[]> {
    const allResults: CrawlResult[] = [];
    let currentBatch = 0;

    while (true) {
      console.log(`Processing batch ${currentBatch + 1}...`);
      
      const batchResults = await crawl(startURL, {
        maxConcurrency: this.maxConcurrency,
        rateLimitMs: 100,
        maxPages: this.batchSize
      });

      if (batchResults.length === 0) break;

      allResults.push(...batchResults);
      currentBatch++;

      // Memory management - force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      console.log(`Batch ${currentBatch} complete. Total results: ${allResults.length}`);
    }

    return allResults;
  }
}
