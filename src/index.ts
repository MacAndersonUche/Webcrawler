import { crawlPage, getURLsFromHTML } from './crawler';

export function sortPages(pages: Record<string, number>): [string, number][] {
  // Convert the object to an array of [url, count]
  const pagesArr = Object.entries(pages);

  // Sort by count (descending)
  pagesArr.sort((a, b) => b[1] - a[1]);

  return pagesArr;
}

async function main() {
  if (process.argv.length < 3) {
    console.log('No website provided');
    process.exit(1);
  }

  if (process.argv.length > 3) {
    console.log('Too many command line args');
    process.exit(1);
  }

  const baseURL = process.argv[2];

  console.log('starting crawler');

  const pages = await crawlPage(baseURL, baseURL, {});

//   for (const page of Object.entries(pages)) {
//     console.log(page);
//   }

  return sortPages(pages)
}

main().then(res => console.log(res));
