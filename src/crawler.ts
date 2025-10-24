import { JSDOM } from 'jsdom';

export async function crawlPage(currentURL: string) {
  console.log(`Actively crawling: ${currentURL}`);

  try {
    const resp = await fetch(currentURL);

    if (resp.status > 399) {
      console.log(
        `Error on fetch woith status code ${resp.status} on page: ${currentURL}`
      );

      return;
    }

    const contentType = resp.headers.get('content-type');

    if (!contentType?.includes('text/html')) {
      console.log(`Content type: ${contentType}, Non html response: ${resp.status} on page: ${currentURL}`);

      return
    }

    console.log(await resp.text());

    return await resp.text();
  } catch (error) {
    console.log(`Error in fetch: ${currentURL} `);
  }
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
