import React from 'react';

const Roadmap = ({ skills, userCourses = [], onUpdateSkillStatus }) => {
  // Group skills by level
  const levels = [
    {
      num: 1,
      name: "Mathematical Foundations & Programming Core",
      subtitle: "Recommended for 2nd Year Semesters 3 & 4. Focuses on coding & math fundamentals.",
      skills: skills.filter(s => s.level === 1)
    },
    {
      num: 2,
      name: "Computational Math & Databases",
      subtitle: "Recommended for 2nd Year / early 3rd Year. Aligning with DBMS and Numerical Methods.",
      skills: skills.filter(s => s.level === 2)
    },
    {
      num: 3,
      name: "Deep Learning & Scientific Modeling",
      subtitle: "Recommended for 3rd Year. Moving from simple models to deep architectures and big data.",
      skills: skills.filter(s => s.level === 3)
    },
    {
      num: 4,
      name: "Cutting-Edge AI & MLOps",
      subtitle: "Recommended for 4th & 5th Year. Advanced systems, deployment, and research applications.",
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
          An interactive, 4-level skill path customized for Integrated M.Tech CSE (Computational & Data Science) students.
        </p>
      </div>

      <div className="roadmap-container">
        {levels.map((level) => (
          <div key={level.num} className="roadmap-level">
            <div className="level-header">
              <div className="level-number">{level.num}</div>
              <div className="level-title-container">
                <h3>{level.name}</h3>
                <p>{level.subtitle}</p>
              </div>
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
        ))}
      </div>
    </div>
  );
};

export default Roadmap;
