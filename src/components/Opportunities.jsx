import { useState, useEffect, useRef } from 'react';

const Opportunities = ({ initialOpportunities, lastUpdated, onRefreshData }) => {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [logs, setLogs] = useState('');
  const [updatedTime, setUpdatedTime] = useState(lastUpdated);
  
  const consoleRef = useRef(null);

  // Keep state synchronized with parent props
  useEffect(() => {
    setOpportunities(initialOpportunities);
  }, [initialOpportunities]);

  useEffect(() => {
    setUpdatedTime(lastUpdated);
  }, [lastUpdated]);

  // Auto-scroll console logs
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Trigger real-time streaming research API
  const handleRunResearch = async () => {
    if (crawling) return;
    
    setCrawling(true);
    setLogs('');
    
    try {
      const response = await fetch('/api/research', { method: 'POST' });
      if (!response.body) {
        setLogs('Error: Streaming response body not supported by browser.');
        setCrawling(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          setLogs(prev => prev + chunk);
        }
      }
      
      // Scrape finished - trigger data refresh in parent
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (error) {
      setLogs(prev => prev + `\n\n[ERROR] Request failed: ${error.message}\n`);
    } finally {
      setCrawling(false);
    }
  };

  // Filter opportunities based on active tab and search query
  const filteredOpps = opportunities.filter(opp => {
    const matchesTab = activeTab === 'all' || 
                       opp.type.toLowerCase() === activeTab.slice(0, -1).toLowerCase() || 
                       (activeTab === 'courses' && (opp.type === 'course' || opp.type === 'certificate'));
                       
    const text = (opp.title + ' ' + opp.organization + ' ' + opp.description + ' ' + opp.tags.join(' ')).toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  // Sort: highest match score first
  const sortedOpps = [...filteredOpps].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Daily Opportunities Hub</h1>
        <p className="section-subtitle">
          Real-time curated hackathons, internships, courses, and certifications matching your profile.
        </p>
      </div>

      {/* Scraper Status Panel */}
      <div className="glass-panel scraper-panel">
        <div className="scraper-header">
          <div className="scraper-info">
            <span className={`pulse-indicator ${crawling ? 'crawling' : 'active'}`}></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {crawling ? 'Running Daily Research Scraper...' : 'Scraper Daemon: Idle'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                Last researched: {updatedTime || 'Never'}
              </div>
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleRunResearch}
            disabled={crawling}
            style={{ opacity: crawling ? 0.6 : 1 }}
          >
            {crawling ? 'Researching...' : '🔍 Run Research Now'}
          </button>
        </div>

        {/* Real-time crawler logs */}
        {(crawling || logs) && (
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-muted))', marginTop: '1.5rem' }}>
              Crawler Output Log
            </div>
            <pre ref={consoleRef} className="console-log">
              {logs || 'Waiting for scraper process...'}
            </pre>
          </div>
        )}
      </div>

      {/* Grid Controls */}
      <div className="opp-controls">
        <div className="opp-tabs">
          <button className={`opp-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            All
          </button>
          <button className={`opp-tab ${activeTab === 'hackathons' ? 'active' : ''}`} onClick={() => setActiveTab('hackathons')}>
            Hackathons
          </button>
          <button className={`opp-tab ${activeTab === 'internships' ? 'active' : ''}`} onClick={() => setActiveTab('internships')}>
            Internships
          </button>
          <button className={`opp-tab ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            Courses & Certs
          </button>
        </div>

        <div className="search-box">
          <span style={{ marginRight: '0.5rem' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search opportunities (e.g., Python, remote, hackathon)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Opportunities Grid */}
      {sortedOpps.length > 0 ? (
        <div className="opp-grid">
          {sortedOpps.map((opp) => (
            <div key={opp.id} className="glass-panel opp-card">
              <div className="opp-card-header">
                <span className="opp-org">{opp.organization}</span>
                <span className={`opp-match ${opp.matchScore >= 95 ? 'high' : ''}`}>
                  {opp.matchScore}% Match
                </span>
              </div>
              
              <h3 className="opp-title">{opp.title}</h3>
              <p className="opp-description">{opp.description}</p>
              
              <div className="opp-tags">
                {opp.tags.map((tag, i) => (
                  <span key={i} className="opp-tag">{tag}</span>
                ))}
              </div>
              
              <div className="opp-meta">
                <span className="opp-deadline">
                  📅 {opp.deadline}
                </span>
                <a 
                  href={opp.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  Apply / View
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
          📭 No opportunities found matching your criteria. Try running the research scraper or relaxing filters.
        </div>
      )}
    </div>
  );
};

export default Opportunities;
