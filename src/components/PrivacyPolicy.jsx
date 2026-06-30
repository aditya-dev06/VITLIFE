
const PrivacyPolicy = () => {
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
              Privacy Policy
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

        {/* DPDP Consent Notice Alert */}
        <div style={{
          backgroundColor: 'rgba(3, 179, 195, 0.1)',
          borderLeft: '4px solid hsl(var(--primary))',
          padding: '1rem 1.25rem',
          borderRadius: '4px',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          lineHeight: '1.5'
        }}>
          <strong>🇮🇳 India DPDP Act 2023 Compliance Notice:</strong> By checking the consent box during registration, you provide free, specific, informed, unconditional, and unambiguous consent to process your personal data for academic tracking, club involvement, and event registration on VIT Life.
        </div>

        {/* Section 1 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            1. Consent and Lawful Basis for Processing
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
            We process your personal data based on your explicit consent (under the <strong>Digital Personal Data Protection Act, 2023</strong>) and our legitimate academic interests (under the <strong>GDPR Article 6(1)(f)</strong>). You retain the right to withdraw your consent at any time. Withdrawal of consent does not affect the lawfulness of processing based on consent before its withdrawal.
          </p>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            2. What Personal Data We Collect
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            To operate the Platform effectively, we collect the following data categories:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Identity & Registration Data:</strong> Full Name, institutional email address (e.g., student ID domains), academic semester, and account verification credentials.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Academic & Engagement Data:</strong> Customized roadmap skill status, XP score, club manager affiliations, created events, and event participation registrations.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Device & Technical Data (Security Compliance):</strong> To fulfill cybersecurity guidelines, we log your IP address, browser User-Agent details, and timestamped actions (registrations, logins, creation, and edits) in our secure compliance log.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            3. Purposes of Data Processing
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            Your personal data is processed solely for the following specified purposes:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.4rem' }}>Managing your user profile, track points (XP), and showcase academic roadmap milestones.</li>
            <li style={{ marginBottom: '0.4rem' }}>Allowing student clubs to publish recruitment notices and campus events.</li>
            <li style={{ marginBottom: '0.4rem' }}>Verifying email identity using secure email-OTP codes to prevent malicious fake registrations.</li>
            <li style={{ marginBottom: '0.4rem' }}>Audit and compliance: Keeping a secure activity log to investigate fraudulent actions or access abuses in compliance with CERT-In directions.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            4. Your Rights under DPDP Act & GDPR
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            As a Data Principal / Data Subject, you are entitled to the following rights:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Right to Access:</strong> Request a summary of the personal data processed and the processing activities we carry out.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Right to Correction & Erasure:</strong> Correct inaccurate records or request the complete deletion of your account and associated personal details.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Right to Grievance Redressal:</strong> Register complaints with our Grievance Officer regarding any perceived compliance violations.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Right to Portability & Restriction (GDPR):</strong> Restrict processing or request a copy of your personal data in a structured, machine-readable format.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            5. Security & Data Retention
          </h2>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Data Security:</strong> Your data is stored on secure servers utilizing MongoDB Atlas database encryption at rest. We enforce TLS encryption for all dynamic HTTP requests.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Retention:</strong> We retain your personal data for as long as your student account is active. Compliance activity logs are retained for audit purposes in accordance with Indian regulatory timelines.
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            6. Grievance Redressal Officer Contact
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
            In compliance with the <strong>Information Technology Act, 2000</strong> and the <strong>DPDP Act, 2023</strong>, we have designated a Grievance Officer. For queries, exercises of rights, or filing of grievances, please contact:
          </p>
          <div style={{
            backgroundColor: 'hsla(var(--text-primary) / 0.02)',
            border: '1px solid hsla(var(--border-glass))',
            padding: '1.25rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            lineHeight: '1.6'
          }}>
            <strong>Grievance Desk:</strong> Platform Compliance Desk / Institutional Admin Desk<br />
            <strong>Designation:</strong> Privacy & Compliance Desk<br />
            <strong>Email:</strong> <a href="mailto:aditya.dev.jp@gmail.com" style={{ color: 'hsl(var(--primary))' }}>aditya.dev.jp@gmail.com</a><br />
            <strong>Address:</strong> VIT Bhopal University, Kothri Kalan, Sehore, Madhya Pradesh - 466114, India.
          </div>
        </section>

        {/* GDPR/CCPA declarations */}
        <section style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1.5rem', marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent))', fontWeight: 700, marginBottom: '0.5rem' }}>
            Global Regulations Alignment
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.88rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
            We do not sell, rent, or trade your personal data. We comply with GDPR regulations concerning EU data subjects and CCPA requirements concerning California residents. If you represent an external entity, contact our officer for clarification.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
