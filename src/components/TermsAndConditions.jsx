
const TermsAndConditions = () => {
  const handleGoHome = () => {
    window.location.replace('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      color: 'hsl(var(--text-primary))',
      padding: '2rem 1.5rem',
      fontFamily: 'Outfit, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '850px',
        width: '100%',
        padding: '3rem',
        borderRadius: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1px solid hsla(var(--border-glass))', paddingBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Terms & Conditions
            </h1>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
              Last Updated: June 19, 2026 • Legal Version 2.1
            </p>
          </div>
          <button 
            onClick={handleGoHome}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'hsla(var(--text-primary) / 0.05)',
              border: '1px solid hsla(var(--border-glass))',
              borderRadius: '8px',
              color: 'hsl(var(--text-primary))',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'hsla(var(--text-primary) / 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'hsla(var(--text-primary) / 0.05)'}
          >
            ← Back to App
          </button>
        </div>

        {/* Introduction */}
        <section style={{ marginBottom: '2rem' }}>
          <p style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
            Welcome to <strong>VIT Life</strong> (referred to as the "Platform", "Service", "we", "us", or "our"). VIT Life is an academic roadmap tracker, student community hub, and events engagement network designed for members of the VIT Bhopal University.
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.95rem', color: 'hsl(var(--text-muted))' }}>
            By registering for an account, accessing, or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions, the Privacy Policy, and all applicable local, national, and international laws, including the <strong>Indian Information Technology Act, 2000</strong> and the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>.
          </p>
        </section>

        {/* Section 1 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            1. User Eligibility and Account Registration
          </h2>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Eligibility:</strong> Registration is restricted to active students, faculty, club managers, and administrators of VIT Bhopal University. You must provide a valid institutional email address (e.g., <code>@vitbhopal.ac.in</code>) to register.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account password and token. Any activities that occur under your account credentials are your sole responsibility.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Verification:</strong> We employ email-based OTP verification systems to confirm identity. You agree to receive verification emails and notification communications.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            2. Code of Conduct & Prohibited Activities
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.75rem' }}>
            In accordance with Rule 3(1)(b) of the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>, you agree not to host, display, upload, modify, publish, transmit, store, update or share any information that:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Belongs to another person and to which you do not have any right.</li>
            <li style={{ marginBottom: '0.5rem' }}>Is defamatory, obscene, pornographic, pedophilic, invasive of another's privacy, insulting or harassing on the basis of gender, libelous, racially or ethnically objectionable.</li>
            <li style={{ marginBottom: '0.5rem' }}>Harmful to minors in any way, or violates any law for the time being in force.</li>
            <li style={{ marginBottom: '0.5rem' }}>Infringes any patent, trademark, copyright, or other proprietary rights.</li>
            <li style={{ marginBottom: '0.5rem' }}>Deceives or misleads the addressee about the origin of the message or knowingly communicates any misinformation.</li>
            <li style={{ marginBottom: '0.5rem' }}>Impersonates another person, contains software viruses, or threatens the unity, integrity, defense, security or sovereignty of India.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            3. Intellectual Property and Content
          </h2>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Platform Content:</strong> The design, layout, logo, code, graphics, interactive roadmaps, and content provided by VIT Life are the property of VIT Life and its developers and are protected under Indian and international copyright laws.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>User Content:</strong> When uploading event posters, descriptions, club recruiter profiles, or project details, you grant VIT Life a non-exclusive, worldwide, royalty-free license to display, host, and distribute that material solely for purposes relevant to the Platform's operations.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            4. Limitation of Liability and Disclaimers
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
            The Platform is provided on an "AS IS" and "AS AVAILABLE" basis without any express or implied warranties. VIT Life acts as an intermediary network for students and student-run clubs. We do not guarantee the completeness, accuracy, or safety of student-created events, roadmaps, external resources, or scraper-aggregated opportunities.
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', color: 'hsl(var(--text-muted))' }}>
            Under no circumstances shall VIT Life, its developer team, or VIT Bhopal University be held liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the platform.
          </p>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            5. Termination & Suspension
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
            We reserve the right, without prior notice or liability, to suspend, disable, or terminate your account and restrict your access to the Platform for any reason, including but not limited to breach of these Terms, non-compliance with University codes of conduct, or malicious tampering with the server APIs.
          </p>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            6. Governing Law & Jurisdiction
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
            These Terms & Conditions shall be governed by, interpreted, and construed in accordance with the laws of the <strong>Republic of India</strong>, without regard to conflict of law principles. Any dispute arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts located in <strong>Bhopal, Madhya Pradesh, India</strong>.
          </p>
        </section>

        {/* Section 7 */}
        <section style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1.5rem', marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent))', fontWeight: 700, marginBottom: '0.5rem' }}>
            Legal Notice and Inquiries
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.88rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
            If you have questions regarding these Terms & Conditions, please contact the Compliance team at: <a href="mailto:aditya.dev.jp@gmail.com" style={{ color: 'hsl(var(--primary))', textDecoration: 'underline' }}>aditya.dev.jp@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditions;
