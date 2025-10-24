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

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.6',
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          color: '#333',
          marginBottom: '30px',
          fontSize: '2.5rem',
          fontWeight: '300',
        }}
      >
        Web Crawler
      </h1>

      <form
        onSubmit={handleCrawl}
        style={{
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL to crawl"
          disabled={isLoading}
          style={{
            padding: '12px 16px',
            width: '400px',
            maxWidth: '100%',
            border: '2px solid #e1e5e9',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#007bff')}
          onBlur={(e) => (e.target.style.borderColor = '#e1e5e9')}
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: isLoading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'background-color 0.2s ease',
            minWidth: '140px',
          }}
        >
          {isLoading ? 'Crawling...' : 'Start Crawling'}
        </button>
      </form>

      {error && (
        <div
          style={{
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2
            style={{
              textAlign: 'center',
              color: '#333',
              marginBottom: '20px',
              fontSize: '1.5rem',
              fontWeight: '400',
            }}
          >
            Results ({results.length} pages)
          </h2>
          {results.map((page, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #e1e5e9',
                padding: '20px',
                marginBottom: '16px',
                borderRadius: '8px',
                backgroundColor: '#f8f9fa',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#007bff',
                  fontSize: '16px',
                  wordBreak: 'break-all',
                }}
              >
                {page.url}
              </div>
              <div style={{ color: '#6c757d', marginBottom: '8px' }}>
                {page.links.length} links found
              </div>
              {page.links.length > 0 && (
                <ul
                  style={{
                    marginTop: '12px',
                    paddingLeft: '20px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {page.links.map((link, linkIndex) => (
                    <li
                      key={linkIndex}
                      style={{
                        fontSize: '14px',
                        color: '#495057',
                        marginBottom: '4px',
                        wordBreak: 'break-all',
                      }}
                    >
                      {link}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
