import React from 'react';

const Roadmap = ({ skills, userCourses = [], userSemester = 1, onUpdateSkillStatus }) => {
  const semNum = parseInt(userSemester, 10);

  const getRecommendedLevel = (sem) => {
    if (sem === 0) return 0; // Global non-student
    if (sem <= 2) return 1;
    if (sem <= 4) return 2;
    if (sem <= 6) return 3;
    return 4;
  };

  const recommendedLevel = getRecommendedLevel(semNum);

  // Group skills by level
  const levels = [
    {
      num: 1,
      name: "Mathematical Foundations & Programming Core",
      subtitle: "Recommended for 1st Year (Sem 1 & 2). Focuses on coding & math fundamentals.",
      skills: skills.filter(s => s.level === 1)
    },
    {
      num: 2,
      name: "Computational Math & Databases",
      subtitle: "Recommended for 2nd Year (Sem 3 & 4). Aligning with DBMS and Numerical Methods.",
      skills: skills.filter(s => s.level === 2)
    },
    {
      num: 3,
      name: "Deep Learning & Scientific Modeling",
      subtitle: "Recommended for 3rd Year (Sem 5 & 6). Moving from simple models to deep architectures and big data.",
      skills: skills.filter(s => s.level === 3)
    },
    {
      num: 4,
      name: "Cutting-Edge AI & MLOps",
      subtitle: "Recommended for 4th & 5th Year (Sem 7+). Advanced systems, deployment, and research applications.",
      skills: skills.filter(s => s.level === 4)
    }
  ];

  const getStatusClass = (status) => {
    switch (status) {
      case 'Completed': return 'status-done';
      case 'In Progress': return 'status-progress';
      default: return 'status-todo';
    }
  };

  const getNextStatus = (current) => {
    if (current === 'To Do') return 'In Progress';
    if (current === 'In Progress') return 'Completed';
    return 'To Do';
  };

  // Check if a skill card matches the user's active semester courses
  const checkIsHighlighted = (skillId) => {
    if (!userCourses || userCourses.length === 0) return false;
    
    if (skillId === 'l1-dsa' && userCourses.includes('DSA')) return true;
    if (skillId === 'l2-sql' && userCourses.includes('DBMS')) return true;
    if (skillId === 'l2-nm' && userCourses.includes('Numerical Methods')) return true;
    if (skillId === 'l1-py' && userCourses.includes('OOP')) return true;
    
    return false;
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">DS & AI Upgrade Roadmap</h1>
        <p className="section-subtitle">
          An interactive, 4-level skill path customized dynamically for your active semester and curriculum.
        </p>
      </div>

      <div className="roadmap-container">
        {levels.map((level) => {
          const isActiveLevel = level.num === recommendedLevel;
          return (
            <div 
              key={level.num} 
              className={`roadmap-level ${isActiveLevel ? 'active-recommended-level' : ''}`}
              style={isActiveLevel ? {
                border: '2px dashed hsl(var(--primary))',
                padding: '1.5rem',
                borderRadius: '12px',
                background: 'hsla(var(--primary) / 0.02)',
                boxShadow: '0 0 15px hsla(var(--primary) / 0.05)',
                marginBottom: '2rem'
              } : { marginBottom: '2rem' }}
            >
              <div className="level-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="level-number" style={isActiveLevel ? { background: 'hsl(var(--primary))', color: 'black' } : {}}>{level.num}</div>
                  <div className="level-title-container">
                    <h3>{level.name}</h3>
                    <p>{level.subtitle}</p>
                  </div>
                </div>
                {isActiveLevel && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'hsl(var(--primary))',
                    border: '1px solid hsl(var(--primary))',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: '0 0 8px hsla(var(--primary) / 0.2)',
                    background: 'hsla(var(--primary) / 0.1)',
                    marginTop: '0.5rem'
                  }}>
                    🎯 Active Semester Focus
                  </span>
                )}
              </div>

            <div className="skills-grid">
              {level.skills.map((skill) => {
                const isHighlighted = checkIsHighlighted(skill.id);
                return (
                  <div 
                    key={skill.id} 
                    className={`glass-panel skill-card ${isHighlighted ? 'highlight-priority' : ''}`}
                  >
                    <div className="skill-header">
                      <div>
                        <h4 className="skill-name">{skill.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{skill.category}</span>
                      </div>
                      <span className={`status-badge ${getStatusClass(skill.status)}`}>
                        {skill.status}
                      </span>
                    </div>

                    <p className="skill-desc">{skill.description}</p>

                    <div className="skill-resource-title">Learning Resources</div>
                    <ul className="resources-list">
                      {skill.resources.map((res, i) => (
                        <li key={i}>
                          <a href={res.link} target="_blank" rel="noopener noreferrer" className="resource-link">
                            🔗 {res.name}
                          </a>
                        </li>
                      ))}
                    </ul>

                    <div className="assignment-box">
                      <span>💡 Practice Assignment</span>
                      {skill.assignment}
                    </div>

                    <div className="skill-actions">
                      <button 
                        className="btn-status-cycle" 
                        onClick={() => onUpdateSkillStatus(skill.id, getNextStatus(skill.status))}
                      >
                        Set to: {getNextStatus(skill.status)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
};

export default Roadmap;
