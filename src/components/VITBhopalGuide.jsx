import React from 'react';

const VITBhopalGuide = ({ isVitBhopal }) => {
  if (isVitBhopal) {
    return (
      <div>
        <div className="section-header">
          <h1 className="section-title">VIT Bhopal Academic Guide</h1>
          <p className="section-subtitle">
            Strategic playbook for Integrated M.Tech CSE (Computational and Data Science) students.
          </p>
        </div>

        {/* Overview Card */}
        <div className="glass-panel guide-card" style={{ marginBottom: '2rem' }}>
          <span className="guide-badge">Integrated Program Strategy</span>
          <h3>The 5-Year Roadmap Edge</h3>
          <p>
            As an Integrated M.Tech student, you have a unique timeline. While you spend 5 years in college, you undergo a massive **9-month capstone industry internship** in your final year. The selection process for these internships begins in your **4th year**. Therefore, having a strong, research-backed portfolio in Computational Modeling and AI by the end of your 3rd year is critical.
          </p>
        </div>

        {/* Grid of semesters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
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
              Identify a niche subdomain in your 2nd or 3rd year, such as **Physics-Informed Neural Networks (PINNs)**, **Bioinformatics**, or **Graph Neural Networks**.
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
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
              <strong>Cloud Hosting:</strong> Deploy simple web applications on free tiers of Render, Hugging Face Spaces, or Koyeb to showcase live interactive demos.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VITBhopalGuide;
