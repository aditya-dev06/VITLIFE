import { useState } from 'react';

const Opportunities = ({ initialOpportunities = [], lastUpdated }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter opportunities based on active tab and search query
  const filteredOpps = initialOpportunities.filter(opp => {
    const matchesTab = activeTab === 'all' || 
                       opp.type.toLowerCase() === activeTab.slice(0, -1).toLowerCase() || 
                       (activeTab === 'courses' && (opp.type === 'course' || opp.type === 'certificate'));
                       
    const text = (opp.title + ' ' + opp.organization + ' ' + opp.description + ' ' + opp.tags.join(' ')).toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  // Sort: highest match score first
  const sortedOpps = [...filteredOpps].sort((a, b) => b.matchScore - a.matchScore);

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
          📭 No opportunities found matching your criteria. Try relaxing your filters.
        </div>
      )}
    </div>
  );
};

export default Opportunities;
