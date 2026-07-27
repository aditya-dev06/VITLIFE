import { useState, useMemo, useEffect, useRef } from 'react';

const sanitizeUrl = (url) => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return '#';
};

const Opportunities = ({ initialOpportunities = [], lastUpdated }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleChunkCount, setVisibleChunkCount] = useState(18);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleChunkCount(18);
  }, [activeTab, searchQuery]);

  // Filter opportunities based on active tab and search query
  const filteredOpps = useMemo(() => {
    return initialOpportunities.filter(opp => {
      const matchesTab = activeTab === 'all' || 
                         opp.type.toLowerCase() === activeTab.slice(0, -1).toLowerCase() || 
                         (activeTab === 'courses' && (opp.type === 'course' || opp.type === 'certificate'));
                         
      const text = (opp.title + ' ' + opp.organization + ' ' + opp.description + ' ' + opp.tags.join(' ')).toLowerCase();
      const matchesSearch = text.includes(searchQuery.toLowerCase());
      
      return matchesTab && matchesSearch;
    });
  }, [initialOpportunities, activeTab, searchQuery]);

  // Sort: highest match score first
  const sortedOpps = useMemo(() => {
    return [...filteredOpps].sort((a, b) => b.matchScore - a.matchScore);
  }, [filteredOpps]);

  const visibleOpps = useMemo(() => {
    return sortedOpps.slice(0, visibleChunkCount);
  }, [sortedOpps, visibleChunkCount]);

  // Auto-load next chunk when scrolling near end
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleChunkCount < sortedOpps.length) {
        setVisibleChunkCount(prev => prev + 18);
      }
    }, { threshold: 0.1 });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleChunkCount, sortedOpps.length]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const normalizedStr = dateStr.replace(/-/g, '/');
      const d = new Date(normalizedStr);
      if (isNaN(d.getTime())) {
        return dateStr;
      }
      return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Daily Opportunities Hub</h1>
        <p className="section-subtitle">
          Real-time curated hackathons, internships, courses, and certifications matching your profile.
        </p>
        {lastUpdated && (
          <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.5rem', color: 'hsl(var(--text-muted))' }}>
            📅 Database synced daily at 10 AM. Last updated: {formatDate(lastUpdated)}
          </span>
        )}
      </div>


      {/* Grid Controls */}
      <div className="opp-controls">
        <div className="opp-tabs" role="tablist" aria-label="Filter opportunities by category">
          <button 
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`opp-tab ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            role="tab"
            aria-selected={activeTab === 'hackathons'}
            className={`opp-tab ${activeTab === 'hackathons' ? 'active' : ''}`} 
            onClick={() => setActiveTab('hackathons')}
          >
            Hackathons
          </button>
          <button 
            role="tab"
            aria-selected={activeTab === 'internships'}
            className={`opp-tab ${activeTab === 'internships' ? 'active' : ''}`} 
            onClick={() => setActiveTab('internships')}
          >
            Internships
          </button>
          <button 
            role="tab"
            aria-selected={activeTab === 'courses'}
            className={`opp-tab ${activeTab === 'courses' ? 'active' : ''}`} 
            onClick={() => setActiveTab('courses')}
          >
            Courses & Certs
          </button>
        </div>

        <div className="search-box">
          <span style={{ marginRight: '0.5rem' }} aria-hidden="true">🔍</span>
          <input 
            type="text" 
            placeholder="Search opportunities (e.g., Python, remote, hackathon)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search opportunities by keyword, skill, or organization"
          />
        </div>
      </div>

      {/* Opportunities Grid */}
      {sortedOpps.length > 0 ? (
        <>
          <div className="opp-grid">
            {visibleOpps.map((opp) => (
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
                    href={sanitizeUrl(opp.link)} 
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

          {/* Infinite Scroll Sentinel & Load More button */}
          {visibleChunkCount < sortedOpps.length && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '2rem', marginBottom: '1.5rem' }}>
              <div ref={sentinelRef} style={{ height: '20px', width: '100%' }} />
              <button
                className="pyq-load-more-btn"
                onClick={() => setVisibleChunkCount(prev => prev + 18)}
                style={{
                  padding: '0.65rem 1.6rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, hsla(var(--primary) / 0.15), hsla(var(--primary) / 0.05))',
                  border: '1px solid hsla(var(--primary) / 0.3)',
                  color: 'hsl(var(--primary))',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px hsla(var(--primary) / 0.12)'
                }}
              >
                <span>Show More Opportunities ({sortedOpps.length - visibleChunkCount} remaining)</span>
                <span>↓</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
          📭 No opportunities found matching your criteria. Try relaxing your filters.
        </div>
      )}
    </div>
  );
};

export default Opportunities;
