import * as express from 'express';
import * as cors from 'cors';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { crawl } from './crawler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
    console.log(`Starting crawl of: ${url}`);
    const results = await crawl(url);
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
