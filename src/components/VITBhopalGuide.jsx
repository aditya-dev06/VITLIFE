

const VITBhopalGuide = ({ isVitBhopal, userSemester = 1, userProgram = '' }) => {
  const semNum = parseInt(userSemester, 10);
  const isIntegrated = userProgram.toLowerCase().includes('integrated') || userProgram.toLowerCase().includes('m.tech') || userProgram.toLowerCase().includes('bim');

  if (isVitBhopal) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">VIT Bhopal Academic Guide</h1>
          <p className="section-subtitle">
            Strategic playbook tailored for your program: <strong>{userProgram || 'VIT Bhopal Student'}</strong>
          </p>
        </div>

        {/* Dynamic Semester Strategy Card */}
        <div className="glass-panel guide-card" style={{ marginBottom: '2rem', borderLeft: '4px solid hsl(var(--primary))' }}>
          <span className="guide-badge" style={{ background: 'hsla(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}>
            🎯 Active Strategy • Semester {semNum}
          </span>
          {semNum <= 2 && (
            <>
              <h3>First Year Foundation (Semester {semNum})</h3>
              <p>Welcome to your academic journey! At this stage, your priority should be building an unshakeable foundation:</p>
              <ul className="guide-tips-list" style={{ marginTop: '0.75rem' }}>
                <li className="guide-tip"><strong>Maintain High CGPA:</strong> Keep your grades above 8.5+. This ensures you bypass CGPA cutoffs for premium Tier-1 companies.</li>
                <li className="guide-tip"><strong>Programming Basics:</strong> Master Python syntax and core object-oriented structures.</li>
                <li className="guide-tip"><strong>Math Fundamentals:</strong> Pay close attention to Linear Algebra and Calculus courses—they are the direct pillars of machine learning.</li>
              </ul>
            </>
          )}
          {semNum >= 3 && semNum <= 4 && (
            <>
              <h3>Second Year Acceleration (Semester {semNum})</h3>
              <p>This is the most critical period to bridge the gap between academic theory and software engineering:</p>
              <ul className="guide-tips-list" style={{ marginTop: '0.75rem' }}>
                <li className="guide-tip"><strong>DSA & Problem Solving (CSE2002):</strong> Set up your LeetCode profile and solve 2 problems daily. Coding assessments are the first filter for all placements.</li>
                <li className="guide-tip"><strong>Relational Databases (CSE3001):</strong> SQL is the most requested skill in data engineering. Master subqueries, indexes, and joins.</li>
                <li className="guide-tip"><strong>OOP Core:</strong> Build modular, readable code. Learn to separate your data manipulation logic from your software interfaces.</li>
              </ul>
            </>
          )}
          {semNum >= 5 && semNum <= 6 && (
            <>
              <h3>Third Year Placement Preparation (Semester {semNum})</h3>
              <p>Placements and internship screening will start soon. It's time to refine your portfolio and focus on applications:</p>
              <ul className="guide-tips-list" style={{ marginTop: '0.75rem' }}>
                <li className="guide-tip"><strong>Project Exhibitions:</strong> Use your Engineering Design or course project exhibitions to build working ML web applications (e.g. using Gradio/Streamlit hosted on HuggingFace Spaces).</li>
                <li className="guide-tip"><strong>Internship Prep:</strong> Revise classical ML models, bias-variance tradeoffs, and data visualization pipelines. Resume screenings look for end-to-end projects.</li>
                <li className="guide-tip"><strong>Club Leadership:</strong> Take up active roles in GDSC, ACM, or IEEE. Leading hackathon organization or workshops shows excellent soft skills.</li>
              </ul>
            </>
          )}
          {semNum >= 7 && semNum <= 8 && (
            <>
              <h3>Fourth Year Placement & Thesis (Semester {semNum})</h3>
              <p>Placements are in full swing. Keep your focus sharp and direct:</p>
              <ul className="guide-tips-list" style={{ marginTop: '0.75rem' }}>
                <li className="guide-tip"><strong>Deep Learning & MLOps:</strong> Move beyond simple notebooks. Understand model training monitoring, containerization (Docker), and deploying APIs (FastAPI).</li>
                <li className="guide-tip"><strong>Interview Sprints:</strong> Mock interview regularly. Practice explaining the mathematics behind algorithms (e.g. SVD, gradient descent) clearly.</li>
                <li className="guide-tip"><strong>Capstone Selection:</strong> Select a challenging project that solves a real-world problem or involves research-focused computational modeling.</li>
              </ul>
            </>
          )}
          {semNum >= 9 && (
            <>
              <h3>Fifth Year Master Capstone & Industry Transition (Semester {semNum})</h3>
              <p>Your 5-year journey culminates in direct industrial research and career takeoff:</p>
              <ul className="guide-tips-list" style={{ marginTop: '0.75rem' }}>
                <li className="guide-tip"><strong>9-Month Capstone Internship:</strong> Maximize your industry internship by taking ownership of projects and aiming for a Pre-Placement Offer (PPO).</li>
                <li className="guide-tip"><strong>M.Tech Research Thesis:</strong> Publish your novel findings in SCOPUS-indexed journals or IEEE conferences under SCSE faculty mentorship.</li>
                <li className="guide-tip"><strong>Advanced ML & Scientific Computing:</strong> Solidify your skills in deep learning, physics-informed neural networks (PINNs), or large-scale data engineering.</li>
              </ul>
            </>
          )}
        </div>

        {/* Overview Card */}
        <div className="glass-panel guide-card" style={{ marginBottom: '2rem' }}>
          <span className="guide-badge">{isIntegrated ? "5-Year Integrated Timeline" : "4-Year B.Tech Timeline"}</span>
          <h3>{isIntegrated ? "The 5-Year M.Tech Timeline Edge" : "The B.Tech Career Sprint"}</h3>
          <p>
            {isIntegrated 
              ? "As an Integrated M.Tech student, you have a unique timeline. While you spend 5 years in college, you undergo a massive 9-month capstone industry internship in your final year. The selection process for these internships begins in your 4th year. Therefore, having a strong, research-backed portfolio in Computational Modeling and AI by the end of your 3rd year is critical."
              : "As a B.Tech student, your roadmap is a 4-year sprint. Placement drives start at the beginning of your 4th year, meaning your summers after the 2nd and 3rd years are crucial for summer internships, open-source contributions, and building a stellar web dev and machine learning portfolio."
            }
          </p>
        </div>

        {/* Grid of semesters */}
        <div className="guide-grid">
          <div className="glass-panel guide-card">
            <span className="guide-badge" style={{ color: 'hsl(var(--primary))' }}>Syllabus Alignment</span>
            <h3>Second Year Core Courses</h3>
            <p>Optimize your college grades while building data science skills by connecting your coursework to practical topics:</p>
            <ul className="guide-tips-list">
              <li className="guide-tip">
                <strong>Data Structures & Algorithms (CSE2002):</strong> Essential for coding assessments. Solve problems on LeetCode/Hackerrank daily.
              </li>
              <li className="guide-tip">
                <strong>Database Management Systems (CSE3001):</strong> SQL is the most requested skill for Data Scientists. Master joins, indexing, and normalization.
              </li>
              <li className="guide-tip">
                <strong>Numerical Methods & Scientific Computing:</strong> The mathematical core of Computational Science. Connect this to Numpy & SciPy simulations.
              </li>
              <li className="guide-tip">
                <strong>Object-Oriented Programming (CSE2001):</strong> Writing production-ready ML code requires clean, modular OOP practices in Python or C++.
              </li>
            </ul>
          </div>

          <div className="glass-panel guide-card">
            <span className="guide-badge" style={{ color: 'hsl(var(--secondary))' }}>Campus Resources</span>
            <h3>VIT Bhopal Ecosystem</h3>
            <p>Leverage campus initiatives and technical communities to accelerate your learning and find teammates:</p>
            <ul className="guide-tips-list">
              <li className="guide-tip">
                <strong>GDSC, ACM & IEEE Chapters:</strong> Join their AI/ML and competitive coding wings. These groups run local hackathons and workshops.
              </li>
              <li className="guide-tip">
                <strong>VTOP Portal Check:</strong> Maintain a CGPA of 8.5+ to remain eligible for premium Tier-1 companies during campus recruitment.
              </li>
              <li className="guide-tip">
                <strong>Digital Library Access:</strong> Use your college credentials to download IEEE, ACM, and Springer research papers for your projects.
              </li>
              <li className="guide-tip">
                <strong>Project Exhibitions:</strong> Use your Engineering Design or course project exhibitions to build working ML prototypes rather than simple static reports.
              </li>
            </ul>
          </div>
        </div>

        {/* Research & Publications Card */}
        <div className="glass-panel guide-card">
          <span className="guide-badge" style={{ color: 'hsl(var(--accent))' }}>Research-Oriented Growth</span>
          <h3>Publishing Research Papers</h3>
          <p>
            Because you will graduate with an M.Tech degree, publishing research is a powerful differentiator. It opens doors to premium research divisions at tech companies (like Microsoft Research, Google DeepMind, or IBM Research) and top-tier PhD programs.
          </p>
          <ul className="guide-tips-list" style={{ marginTop: '1rem' }}>
            <li className="guide-tip">
              Identify a niche subdomain in your 2nd or 3rd year, such as <strong>Physics-Informed Neural Networks (PINNs)</strong>, <strong>Bioinformatics</strong>, or <strong>Graph Neural Networks</strong>.
            </li>
            <li className="guide-tip">
              Approach professors in the School of Computing Science and Engineering (SCSE) who specialize in data analytics or numerical simulations.
            </li>
            <li className="guide-tip">
              Write survey papers or implement novel applications of existing ML architectures to real-world datasets, and aim to publish in SCOPUS-indexed journals or IEEE conferences.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Else render Global Guide
  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">DS & AI Career Playbook</h1>
        <p className="section-subtitle">
          Global industry-readiness strategies for aspiring Data Scientists and Machine Learning Engineers.
        </p>
      </div>

      {/* Portfolio Strategy */}
      <div className="glass-panel guide-card" style={{ marginBottom: '2rem' }}>
        <span className="guide-badge" style={{ color: 'hsl(var(--secondary))' }}>Portfolio Construction</span>
        <h3>Building a Standout GitHub Portfolio</h3>
        <p>
          In Data Science and AI, recruiters prioritize working repositories over certificates. Your portfolio should include at least three end-to-end projects demonstrating complete data pipelines.
        </p>
        <ul className="guide-tips-list" style={{ marginTop: '1.25rem' }}>
          <li className="guide-tip">
            <strong>Clean Code Practice:</strong> Enforce PEP8 style guidelines, use clear variable names, and write comments explaining mathematical operations.
          </li>
          <li className="guide-tip">
            <strong>Excellent Readmes:</strong> Include clear instructions on how to install dependencies, run code, and interpret the final plots/metrics.
          </li>
          <li className="guide-tip">
            <strong>Open-Source Contributions:</strong> Contribute to libraries like Scikit-Learn, PyTorch, or Hugging Face. Fixing minor bugs or writing docs is a massive differentiator on your CV.
          </li>
        </ul>
      </div>

      {/* Grid of strategies */}
      <div className="guide-grid">
        <div className="glass-panel guide-card">
          <span className="guide-badge" style={{ color: 'hsl(var(--primary))' }}>Competitive Learning</span>
          <h3>Kaggle & Hackathons</h3>
          <p>Gain practical experience by competing on platforms where real-world datasets are optimized:</p>
          <ul className="guide-tips-list">
            <li className="guide-tip">
              <strong>Kaggle Competitions:</strong> Focus on understanding feature engineering, cross-validation splits, and ensemble models (XGBoost, LightGBM).
            </li>
            <li className="guide-tip">
              <strong>Devpost Virtual Hackathons:</strong> Build functional applications using Generative AI (LLMs, RAG models, and agent architectures) during weekend sprints.
            </li>
            <li className="guide-tip">
              <strong>DrivenData (Social Good):</strong> Solve modeling challenges for humanitarian projects, showing your commitment to AI ethics and real-world impact.
            </li>
          </ul>
        </div>

        <div className="glass-panel guide-card">
          <span className="guide-badge" style={{ color: 'hsl(var(--accent))' }}>System Scale</span>
          <h3>MLOps & Model Deployment</h3>
          <p>Transition from notebook scripts to production systems by mastering basic deployment tools:</p>
          <ul className="guide-tips-list">
            <li className="guide-tip">
              <strong>FastAPI / Flask:</strong> Wrap your scikit-learn or PyTorch models in endpoints that accept JSON payloads and return predictions.
            </li>
            <li className="guide-tip">
              <strong>Containerization (Docker):</strong> Ensure your environment runs consistently on any server by writing a Dockerfile for your model service.
            </li>
            <li className="guide-tip">
              <strong>Cloud Hosting:</strong> Deploy simple web applications on free tiers of Hugging Face Spaces or Koyeb to showcase live interactive demos.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VITBhopalGuide;
