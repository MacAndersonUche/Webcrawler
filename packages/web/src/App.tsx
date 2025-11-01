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
    <div className="max-w-4xl mx-auto p-5 font-sans leading-relaxed">
      <h1 className="text-center text-gray-800 mb-8 text-4xl font-light">
        Web Crawler
      </h1>

      <form
        onSubmit={handleCrawl}
        className="mb-8 flex justify-center gap-2.5 flex-wrap"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL to crawl"
          disabled={isLoading}
          className="px-4 py-3 w-96 max-w-full border-2 border-gray-200 rounded-lg text-base outline-none transition-colors duration-200 focus:border-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={`px-6 py-3 text-white border-none rounded-lg cursor-pointer text-base font-medium transition-colors duration-200 min-w-[140px] ${
            isLoading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isLoading ? 'Crawling...' : 'Start Crawling'}
        </button>
      </form>

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg mb-5 text-center">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2 className="text-center text-gray-800 mb-5 text-2xl font-normal">
            Results ({results.length} pages)
          </h2>
          {results.map((page, index) => (
            <div
              key={index}
              className="border border-gray-200 p-5 mb-4 rounded-lg bg-gray-50 shadow-sm"
            >
              <div className="font-semibold mb-3 text-blue-500 text-base break-all">
                {page.url}
              </div>
              <div className="text-gray-500 mb-2">
                {page.links.length} links found
              </div>
              {page.links.length > 0 && (
                <ul className="mt-3 pl-5 max-h-48 overflow-y-auto">
                  {page.links.map((link, linkIndex) => (
                    <li
                      key={linkIndex}
                      className="text-sm text-gray-600 mb-1 break-all"
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
