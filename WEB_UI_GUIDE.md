# Web Crawler - HTML Interface

A simple, clean web interface for the web crawler that shows results after crawling completes.

## Features

- 🎨 **Modern UI**: Clean, responsive design with gradient backgrounds
- 📊 **Statistics**: Pages visited, total links, average links per page
- 🔍 **Detailed Results**: See all crawled pages with their links
- 📱 **Mobile Friendly**: Responsive design that works on all devices
- ⚡ **Simple**: No complex real-time updates, just shows results when done

## Quick Start

### 1. Start the Web Server

```bash
npm run start:web
```

The server will start on `http://localhost:3000`

### 2. Open Your Browser

Navigate to `http://localhost:3000` in your browser.

### 3. Start Crawling

1. Enter a URL in the input field (e.g., `https://example.com`)
2. Click "Start Crawling"
3. Watch the real-time progress updates
4. View the detailed results when complete

## Interface Overview

### Main Features

- **URL Input**: Enter any valid URL to crawl
- **Progress Bar**: Simple loading indicator
- **Status Messages**: Clear feedback during crawling
- **Statistics Cards**: Summary of crawl results
- **Page List**: Detailed view of all crawled pages and their links

### Simple Progress

The interface shows a loading state while crawling:

- Loading spinner during crawl
- Results displayed when complete
- Error messages if something goes wrong

### Results Display

After crawling completes, you'll see:

- **Total Pages**: Number of unique pages visited
- **Total Links**: Total number of links found across all pages
- **Average Links**: Average links per page
- **Page Details**: Each page with its discovered links

## Example URLs to Try

### Small Sites (Good for Testing)

- `https://example.com` - Simple, single page
- `https://httpbin.org` - API testing site with multiple pages
- `https://jsonplaceholder.typicode.com` - REST API with multiple endpoints

### Medium Sites

- `https://github.com` - Large site (will take longer)
- `https://stackoverflow.com` - Community site with many pages

### Note on Large Sites

- Large sites may take several minutes to crawl
- The interface will show progress in real-time
- You can stop and restart if needed

## Technical Details

### Architecture

- **Frontend**: Pure HTML/CSS/JavaScript (no frameworks)
- **Backend**: Express.js with WebSocket support
- **Real-time**: WebSocket connections for live updates
- **Styling**: Modern CSS with gradients and animations

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design

### Performance

- Real-time updates without page refresh
- Efficient WebSocket communication
- Responsive UI that doesn't block during crawling

## Troubleshooting

### Common Issues

1. **"Connection error"**

   - Make sure the server is running (`npm run start:web`)
   - Check that port 3000 is available

2. **"Invalid URL format"**

   - Ensure the URL starts with `http://` or `https://`
   - Example: `https://example.com` (not `example.com`)

3. **Crawl takes too long**

   - Large sites can take several minutes
   - You can stop and try a smaller site
   - Check the progress bar for updates

4. **No results found**
   - The site might not have internal links
   - Check if the site is accessible
   - Try a different URL

### Server Logs

The server will log:

- WebSocket connections
- Crawl progress
- Errors and warnings
- HTTP requests

## Development

### File Structure

```
public/
  └── index.html          # Web interface
src/
  ├── server.ts           # Express server with WebSocket
  ├── crawler.ts          # Core crawling logic
  └── index.ts           # CLI interface
```

### Customization

You can modify:

- **Styling**: Edit `public/index.html` CSS
- **Server**: Modify `src/server.ts`
- **Crawler**: Update `src/crawler.ts`

### Adding Features

Potential enhancements:

- Save results to file
- Export to different formats
- Crawl depth limiting
- Rate limiting controls
- Custom user agent
- Robots.txt support

## Comparison: CLI vs Web Interface

### CLI Interface (`npm start`)

- ✅ Fast and lightweight
- ✅ Scriptable and automatable
- ✅ Good for batch processing
- ❌ No visual feedback
- ❌ Requires terminal knowledge

### Web Interface (`npm run start:web`)

- ✅ Beautiful, intuitive interface
- ✅ Real-time progress updates
- ✅ Easy to use for non-technical users
- ✅ Visual results display
- ❌ Requires web server
- ❌ More resource intensive

## Production Deployment

For production use, consider:

1. **Environment Variables**

   ```bash
   PORT=3000
   NODE_ENV=production
   ```

2. **Process Management**

   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start src/server.ts --name webcrawler
   ```

3. **Reverse Proxy**

   - Use Nginx or Apache
   - SSL termination
   - Load balancing

4. **Security**
   - Rate limiting
   - Input validation
   - CORS configuration
   - Authentication (if needed)

## Next Steps

The web interface demonstrates:

- Modern web development practices
- Real-time communication (WebSockets)
- Responsive design
- User experience considerations
- API design and integration

This complements the core crawler implementation and shows how to build user-friendly interfaces for technical tools.
