import { crawl } from './crawler';

/**
 * Print the crawl results in a readable format
 */
function printResults(results: Awaited<ReturnType<typeof crawl>>): void {
  console.log('\n' + '='.repeat(80));
  console.log('CRAWL COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total pages visited: ${results.length}\n`);

  for (const result of results) {
    console.log(`\nURL: ${result.url}`);
    console.log(`Links found (${result.links.length}):`);
    
    if (result.links.length === 0) {
      console.log('  (no links)');
    } else {
      result.links.forEach(link => {
        console.log(`  - ${link}`);
      });
    }
  }
}

async function main() {
  // Validate command line arguments
  if (process.argv.length < 3) {
    console.error('Error: No URL provided');
    console.log('\nUsage: npm start <url>');
    console.log('Example: npm start https://monzo.com');
    process.exit(1);
  }

  if (process.argv.length > 3) {
    console.error('Error: Too many arguments');
    console.log('\nUsage: npm start <url>');
    process.exit(1);
  }

  const startURL = process.argv[2];

  // Validate URL format
  try {
    new URL(startURL);
  } catch (error) {
    console.error(`Error: Invalid URL format: ${startURL}`);
    console.log('\nPlease provide a valid URL (e.g., https://example.com)');
    process.exit(1);
  }

  console.log('Web Crawler Starting...');
  console.log(`Target: ${startURL}`);
  console.log('='.repeat(80));

  try {
    // Use concurrent crawling with production settings
    const results = await crawl(startURL, {
      maxConcurrency: 5,    // Process up to 5 URLs simultaneously
      rateLimitMs: 100     // 100ms delay between batches for server respect
    });
    printResults(results);
  } catch (error) {
    console.error('\nCrawl failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
