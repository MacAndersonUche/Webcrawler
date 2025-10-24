import React, { useState } from 'react';

interface CrawlResult {
  url: string;
  links: string[];
}

function App() {
  const [results, setResults] = useState<CrawlResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('https://example.com');

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Crawl failed');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const totalLinks = results.reduce((sum, page) => sum + page.links.length, 0);

  return (
    <div className="container">
      <div className="header">
        <h1>🕷️ Web Crawler</h1>
        <p>Crawl websites and discover all internal links</p>
      </div>

      <div className="form-section">
        <form onSubmit={handleCrawl} className="form-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="url-input"
            placeholder="Enter URL to crawl"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="crawl-btn"
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? 'Crawling...' : 'Start Crawling'}
          </button>
        </form>

        {(isLoading || error) && (
          <div className={`status show ${error ? 'error' : 'crawling'}`}>
            {isLoading ? (
              <>
                <span className="loading"></span> Crawling... Please wait.
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '50%' }}></div>
                </div>
              </>
            ) : (
              <div className="error-message">{error}</div>
            )}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="results">
          <h2>Crawl Results</h2>

          <div className="stats">
            <div className="stat-card">
              <div className="stat-number">{results.length}</div>
              <div className="stat-label">Pages Visited</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{totalLinks}</div>
              <div className="stat-label">Total Links Found</div>
            </div>
          </div>

          <div className="page-list">
            {results.map((page, index) => (
              <div key={index} className="page-item">
                <div className="page-url">{page.url}</div>
                <div className="page-links">
                  <strong>{page.links.length}</strong> links found
                  {page.links.length > 0 && (
                    <div className="links-list">
                      {page.links.map((link, linkIndex) => (
                        <div key={linkIndex} className="link-item">
                          {link}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
