import { JSDOM } from 'jsdom';

export type PageMap = Record<string, number>;

/**
 * Crawl a web page and collect links to other pages on the same website.
 *
 * - Only visits pages on the same domain.
 * - Keeps track of how many times each page is visited.
 * - Recursively follows internal links.
 */
export async function crawlPage(
  baseURL: string,
  currentURL: string,
  pages: PageMap
): Promise<PageMap> {
  try {
    // Create URL objects for comparison and parsing
    const base = new URL(baseURL);
    const current = new URL(currentURL);

    // 1️⃣ Skip if the current page is from a different domain
    if (base.hostname !== current.hostname) {
      console.log(`Skipping ${currentURL} (different domain)`);
      return pages;
    }

    // 2️⃣ Normalize the URL (remove trailing slash, etc.)
    const normalizedURL = normalizeURL(currentURL);

    // 3️⃣ If we've already seen this page before, increase its count
    if (pages[normalizedURL]) {
      pages[normalizedURL] += 1;
      console.log(
        `Already visited ${currentURL} (${pages[normalizedURL]} times)`
      );
      return pages;
    }

    // 4️⃣ Otherwise, mark this page as visited for the first time
    pages[normalizedURL] = 1;
    console.log(`🕷️ Crawling: ${currentURL}`);

    // 5️⃣ Try to fetch the page contents
    const response = await fetch(currentURL);

    // 6️⃣ If the request failed (e.g., 404 or 500), skip this page
    if (!response.ok) {
      console.warn(`❌ Failed (${response.status}) to fetch: ${currentURL}`);
      return pages;
    }

    // 7️⃣ Check if the page is actually HTML (ignore images, PDFs, etc.)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      console.log(`Skipping ${currentURL} (not HTML)`);
      return pages;
    }

    // 8️⃣ Read the HTML content
    const htmlBody = await response.text();

    // 9️⃣ Extract all internal links from the page
    const nextURLs = getURLsFromHTML(htmlBody, baseURL);

    // 🔁 10️⃣ Recursively crawl each of those links
    for (const nextURL of nextURLs) {
      pages = await crawlPage(baseURL, nextURL, pages);
    }
  } catch (error) {
    // Catch any network or parsing errors
    console.error(`⚠️ Error while crawling ${currentURL}:`, error);
  }

  // Return the final map of visited pages
  return pages;
}

export function normalizeURL(urlstring: string) {
  const urlObj = new URL(urlstring);
  const hostPath = `${urlObj.hostname}${urlObj.pathname}`;

  if (hostPath.length > 0 && hostPath.slice(-1) === '/') {
    return hostPath.slice(0, -1);
  }

  return hostPath;
}

export function getURLsFromHTML(htmlBody: string, baseURL: string) {
  const urls: string[] = [];
  const dom = new JSDOM(htmlBody);

  const linkElements = dom.window.document.querySelectorAll('a');

  for (const element of linkElements) {
    if (element.href.slice(0, 1) === '/') {
      try {
        const urlObj = new URL(`${baseURL}${element.href}`);
        urls.push(urlObj.href);
      } catch (error) {
        console.log(`Error with relative url ${error}`);
      }
    } else {
      try {
        const urlObj = new URL(element.href);
        urls.push(urlObj.href);
      } catch (error) {
        console.log(`Error with absolute url ${error}`);
      }
    }
  }
  return urls;
}
