import { JSDOM } from 'jsdom';

export interface CrawlResult {
  url: string;
  links: string[];
}

/**
 * Normalize a URL by removing trailing slashes and fragments
 */
export function normalizeURL(urlString: string): string {
  try {
    const url = new URL(urlString);
    // Remove trailing slash and fragment
    let path = url.pathname;
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    // Ensure at least empty string if path becomes empty
    if (path === '') {
      path = '';
    }
    return `${url.protocol}//${url.hostname}${path}${url.search}`;
  } catch (error) {
    throw new Error(`Invalid URL: ${urlString}`);
  }
}

/**
 * Check if a URL belongs to the same subdomain as the base URL
 * e.g., monzo.com should not crawl community.monzo.com
 */
export function isSameSubdomain(baseURL: string, targetURL: string): boolean {
  try {
    const base = new URL(baseURL);
    const target = new URL(targetURL);
    return base.hostname === target.hostname;
  } catch (error) {
    return false;
  }
}

/**
 * Extract all links from HTML content
 */
export function getLinksFromHTML(html: string, baseURL: string): string[] {
  const links: string[] = [];
  const dom = new JSDOM(html);
  const anchorElements = dom.window.document.querySelectorAll('a');

  for (const anchor of anchorElements) {
    const href = anchor.getAttribute('href');
    if (!href) continue;

    try {
      // Handle relative and absolute URLs
      const absoluteURL = new URL(href, baseURL);
      
      // Only include http and https protocols
      if (absoluteURL.protocol !== 'http:' && absoluteURL.protocol !== 'https:') {
        continue;
      }
      
      links.push(absoluteURL.href);
    } catch (error) {
      // Skip invalid URLs
      continue;
    }
  }

  return links;
}

/**
 * Fetch and parse a single page
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`  ✗ HTTP ${response.status}: ${url}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`  ✗ Error fetching ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Crawl a website starting from a base URL with configurable concurrency
 * Returns a list of crawled pages with their links
 */
export async function crawl(
  startURL: string, 
  options: { maxConcurrency?: number; rateLimitMs?: number } = {}
): Promise<CrawlResult[]> {
  const { maxConcurrency = 5, rateLimitMs = 100 } = options;
  
  const results: CrawlResult[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startURL];
  const inProgress = new Set<string>();
  let isProcessing = false;

  const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    while (queue.length > 0 || inProgress.size > 0) {
      // Start new requests up to concurrency limit
      const availableSlots = maxConcurrency - inProgress.size;
      const urlsToProcess = queue.splice(0, availableSlots);

      if (urlsToProcess.length > 0) {
        // Process URLs concurrently
        const promises = urlsToProcess.map(url => processURL(url));
        await Promise.allSettled(promises);
      }

      // Rate limiting
      if (queue.length > 0 || inProgress.size > 0) {
        await new Promise(resolve => setTimeout(resolve, rateLimitMs));
      }
    }

    isProcessing = false;
  };

  const processURL = async (url: string) => {
    const normalizedURL = normalizeURL(url);
    
    // Skip if already visited or in progress
    if (visited.has(normalizedURL) || inProgress.has(normalizedURL)) {
      return;
    }

    // Skip if not same subdomain
    if (!isSameSubdomain(startURL, url)) {
      return;
    }

    inProgress.add(normalizedURL);
    console.log(`\n✓ Visiting: ${normalizedURL}`);

    try {
      // Fetch the page
      const html = await fetchPage(url);
      if (!html) {
        results.push({ url: normalizedURL, links: [] });
        return;
      }

      // Extract links
      const links = getLinksFromHTML(html, url);
      const normalizedLinks = [...new Set(links.map(link => normalizeURL(link)))];
      
      console.log(`  Found ${normalizedLinks.length} links`);
      
      results.push({
        url: normalizedURL,
        links: normalizedLinks
      });

      // Add internal links to queue
      for (const link of links) {
        if (isSameSubdomain(startURL, link)) {
          queue.push(link);
        }
      }
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      results.push({ url: normalizedURL, links: [] });
    } finally {
      visited.add(normalizedURL);
      inProgress.delete(normalizedURL);
    }
  };

  await processQueue();
  return results;
}
