import express from 'express';
import cors from 'cors';
// Removed unused imports
import { crawl } from './crawler.js';

// Remove unused __dirname since we're not serving static files anymore

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint to start crawling
app.post('/api/crawl', async (req: express.Request, res: express.Response) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Validate URL
    new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    console.log(`Starting concurrent crawl of: ${url}`);
    
    // Configure concurrency for production use
    const results = await crawl(url, {
      maxConcurrency: 5,    // Process up to 5 URLs simultaneously
      rateLimitMs: 100     // 100ms delay between batches
    });
    
    console.log(`Crawl complete: ${results.length} pages found`);
    
    res.json({ 
      success: true, 
      results,
      message: `Crawl complete! Found ${results.length} pages.`
    });
  } catch (error) {
    console.error('Crawl error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Web Crawler Server running on http://localhost:${PORT}`);
  console.log(`📱 Open your browser and navigate to the URL above`);
});
