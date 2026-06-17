import React from 'react';

const Dashboard = ({ stats, user, opportunities, roadmapProgress, onNavigate }) => {
  const inProgressSkills = stats.inProgressSkillsList || [];
  const activeOpportunities = opportunities ? opportunities.slice(0, 3) : [];

  // Helper to extract registration number
  const getRegNumber = () => {
    if (!user || !user.isVitBhopal || !user.email) return '';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return parts[1].toUpperCase();
    }
    return '';
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Welcome Back, {user ? user.name : 'Data Explorer'}</h1>
        <p className="section-subtitle">
          Here is your computational intelligence hub for today. Keep building, coding, and researching.
        </p>
      </div>

      {/* Info Banner */}
      <div className="glass-panel info-banner">
        <div className="info-banner-content" style={{ maxWidt: '100%' }}>
          <span className="branch-badge">
            {user && user.isVitBhopal 
              ? `VIT Bhopal Student • ${getRegNumber()}` 
              : 'Global Data Science & AI Member'}
          </span>
          
          <h2 style={{ marginTop: '0.5rem' }}>
            {user && user.isVitBhopal ? 'Integrated M.Tech CSE (Computational & Data Science)' : 'Master Computational Science & AI'}
          </h2>
          
          <p>
            Your profile blends mathematical modeling, software systems, and artificial intelligence. Use this dashboard to bridge theoretical knowledge with active hackathons and real-time remote internships.
          </p>

          {user && user.isVitBhopal && user.courses && user.courses.length > 0 && (
            <div style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--secondary))', marginBottom: '0.5rem' }}>
                📌 Active Semester Courses Highlighted:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {user.courses.map((course) => (
                  <span 
                    key={course} 
                    style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      padding: '0.2rem 0.5rem', 
                      background: 'rgba(6, 182, 212, 0.1)', 
                      color: 'hsl(var(--secondary))', 
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                      borderRadius: '4px' 
                    }}
                  >
                    {course}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button className="btn-primary" onClick={() => onNavigate('roadmap')}>
            View Skill Roadmap
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-info">
            <div className="label">Total Progress</div>
            <div className="value">{roadmapProgress}%</div>
          </div>
          <div className="stat-icon" style={{ background: 'hsla(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}>
            📊
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <div className="label">Skills Mastered</div>
            <div className="value">{stats.completedSkills} / {stats.totalSkills}</div>
          </div>
          <div className="stat-icon" style={{ background: 'hsla(200, 100%, 50%, 0.15)', color: '#00e5ff' }}>
            ⚡
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <div className="label">Active Opportunities</div>
            <div className="value">{opportunities.length}</div>
          </div>
          <div className="stat-icon" style={{ background: 'hsla(300, 100%, 50%, 0.15)', color: '#f50057' }}>
            🎯
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <div className="label">Practice Arena XP</div>
            <div className="value">{stats.xpPoints} XP</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)' }}>
            🏆
          </div>
        </div>
      </div>

      {/* Dashboard Main Split Layout */}
      <div className="dash-layout">
        {/* Left: Focus / Roadmap Tasks */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Focus Items for Today</h3>
          <div className="quick-list">
            {inProgressSkills.length > 0 ? (
              inProgressSkills.map((skill, index) => (
                <div key={index} className="glass-card quick-item">
                  <div className="quick-bullet"></div>
                  <div className="quick-content">
                    <div className="quick-title">Resume Learning: {skill.name}</div>
                    <div className="quick-meta">Category: {skill.category} | Level {skill.level}</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => onNavigate('roadmap')}>
                    Open
                  </button>
                </div>
              ))
            ) : (
              <div className="glass-card quick-item" style={{ color: 'hsl(var(--text-muted))', justifyContent: 'center' }}>
                🎉 You don't have any skills marked as "In Progress". Go to the Roadmap to select one!
              </div>
            )}

            <div className="glass-card quick-item">
              <div className="quick-bullet" style={{ background: 'hsl(var(--secondary))' }}></div>
              <div className="quick-content">
                <div className="quick-title">Daily Practice Quiz</div>
                <div className="quick-meta">Test your statistics & ML knowledge to earn 50 XP</div>
              </div>
              <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => onNavigate('practice')}>
                Solve
              </button>
            </div>
          </div>
        </div>

        {/* Right: Latest Opportunities Preview */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Latest Openings</h3>
          <div className="quick-list">
            {activeOpportunities.length > 0 ? (
              activeOpportunities.map((opp) => (
                <div key={opp.id} className="glass-card quick-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span className="opp-org" style={{ fontSize: '0.7rem' }}>{opp.organization}</span>
                    <span className="opp-match" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>{opp.matchScore}% match</span>
                  </div>
                  <div className="quick-title" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {opp.title}
                  </div>
                  <div className="opp-tags" style={{ margin: 0 }}>
                    <span className="opp-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{opp.type}</span>
                    <span className="opp-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{opp.deadline}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card quick-item" style={{ color: 'hsl(var(--text-muted))', justifyContent: 'center' }}>
                📭 No active openings available. Click opportunities tab to crawl.
              </div>
            )}
            <button className="btn-secondary" style={{ width: '100%', padding: '0.6rem' }} onClick={() => onNavigate('opportunities')}>
              View All Opportunities →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
