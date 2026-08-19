
const PrivacyPolicy = () => {
  const handleGoHome = () => {
    window.location.replace('/');
  };

  return (
    <main style={{
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
              Last Updated: July 26, 2026 • Statutory Compliance Version 3.0 (DPDP Act 2023 & IT Act 2000 Compliant)
            </p>
          </div>
          <button 
            onClick={handleGoHome}
            aria-label="Back to main application"
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

        {/* Statutory Compliance Notice Banner */}
        <div style={{
          backgroundColor: 'rgba(3, 179, 195, 0.1)',
          borderLeft: '4px solid hsl(var(--primary))',
          padding: '1rem 1.25rem',
          borderRadius: '4px',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          lineHeight: '1.5'
        }}>
          <strong>🇮🇳 India DPDP Act 2023 & Statutory Notice:</strong> VIT Life ("Platform") processes your personal data strictly in accordance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, the <strong>Information Technology Act, 2000</strong>, the <strong>IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>, CERT-In Directives, and <strong>Google Play Developer Policies</strong>. By creating an account or using the platform, you provide free, specific, informed, unconditional, and unambiguous consent for processing specified herein.
        </div>

        {/* Section 1 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            1. Lawful Basis and Consent Management
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            Under Section 4 and Section 6 of the DPDP Act 2023, personal data is processed solely for lawful purposes on the basis of your explicit consent or legitimate educational uses:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.4rem' }}>
              <strong>Notice of Processing (DPDP Sec 5):</strong> Prior to or at the time of giving consent, you are informed of the data collected, specific processing purposes, rights of data principals, and grievance redressal contact.
            </li>
            <li style={{ marginBottom: '0.4rem' }}>
              <strong>Right to Withdraw Consent (DPDP Sec 6(4)):</strong> You have the absolute right to withdraw your consent at any time without fee. Consent can be withdrawn by updating account settings or sending an email request to our Grievance Desk at <a href="mailto:vitlife.compliance@gmail.com" style={{ color: 'hsl(var(--primary))' }}>vitlife.compliance@gmail.com</a>.
            </li>
            <li style={{ marginBottom: '0.4rem' }}>
              <strong>Effect of Withdrawal:</strong> Upon consent withdrawal, we will cease processing your personal data within 30 days and purge active records, except where retention is mandated by law (e.g. CERT-In security logging).
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            2. Personal Data We Collect & Device Permissions
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            In compliance with Google Play Data Disclosure guidelines, we provide a full breakdown of collected data:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>User Identity & Verification Data:</strong> Full name, institutional email address (<code>@vitbhopal.ac.in</code>), student registration number, academic program/semester, and encrypted password hash.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Academic & Engagement Data:</strong> Personalized roadmap skill completion status, XP points earned, club affiliations, created events, and event participation registrations.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Technical & Cyber Security Logs (CERT-In Mandate):</strong> IP address, device model, operating system version, browser User-Agent details, login timestamps, and security audit events. These logs are maintained pursuant to Section 70B of the IT Act, 2000.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Zero Sensitive Permissions Policy:</strong> VIT Life does <em>not</em> access your precise background location, contacts, device SMS, camera, microphone, or storage without explicit runtime prompt and authorization.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            3. Purpose of Data Processing & No Data Monetization
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            Your personal data is used exclusively for:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.4rem' }}>Authenticating user access using one-time verification passcodes (OTP).</li>
            <li style={{ marginBottom: '0.4rem' }}>Managing student academic roadmaps, tracking skill milestones, and displaying leaderboard XP.</li>
            <li style={{ marginBottom: '0.4rem' }}>Enabling student clubs to post campus events, hackathons, and recruitment notices.</li>
            <li style={{ marginBottom: '0.4rem' }}>Preventing unauthorized access, cyber incident response, and maintaining security compliance logs.</li>
          </ul>
          <div style={{ backgroundColor: 'hsla(var(--text-primary) / 0.03)', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.88rem', border: '1px dashed hsla(var(--border-glass))' }}>
            <strong>🚫 Strict No-Sale & No-Ad Policy:</strong> We do <strong>NOT</strong> sell, rent, trade, or monetize your personal data to third parties, data brokers, or advertisers under any circumstances.
          </div>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            4. Protection of Children's & Minor Data (DPDP Act Sec 9)
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
            VIT Life is designed for university students. In compliance with Section 9 of the DPDP Act 2023:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.4rem' }}>Users under the age of 18 years ("Children") must obtain verifiable consent from their parent or legal guardian prior to registering on the Platform.</li>
            <li style={{ marginBottom: '0.4rem' }}>We do <strong>not</strong> engage in targeted advertising, behavioral tracking, or profiling directed at minors.</li>
            <li style={{ marginBottom: '0.4rem' }}>If we discover that personal data of a minor has been submitted without verifiable parental consent, we will promptly delete such account data.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            5. Your Rights as a Data Principal (DPDP Act & GDPR)
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            Under Sections 11, 12, 13, and 14 of the DPDP Act 2023 and global standards (GDPR), you hold the following statutory rights:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Right to Access (Sec 11):</strong> Request a summary of your personal data processed by us and the identity of all third parties with whom data has been shared.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Right to Correction & Erasure (Sec 12):</strong> Request correction of inaccurate or incomplete personal data, or request total deletion of your profile and data.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Right to Grievance Redressal (Sec 13):</strong> Register complaints directly with our Grievance Officer. You also retain the right to escalate unresolved grievances to the <strong>Data Protection Board of India</strong>.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Right to Nominate (Sec 14):</strong> You have the right to nominate any individual to exercise your rights under the DPDP Act in the event of your death or incapacity.
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            6. Account & Data Deletion Policy (Google Play Requirement)
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            In full compliance with Google Play's Account Deletion Policy, users can request deletion of their account and associated data through either of the following mechanisms:
          </p>
          <div style={{ backgroundColor: 'hsla(var(--text-primary) / 0.02)', border: '1px solid hsla(var(--border-glass))', padding: '1rem 1.25rem', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '0.75rem' }}>
            <strong>Option A (In-App Deletion):</strong> Navigate to <em>Profile / Account Settings → Edit Profile → Delete My Account</em>. Confirm deletion to initiate immediate account revocation.<br />
            <strong>Option B (Web & Email Deletion Request):</strong> Send a deletion request email from your registered institutional email address to <a href="mailto:vitlife.compliance@gmail.com" style={{ color: 'hsl(var(--primary))' }}>vitlife.compliance@gmail.com</a> with the subject line <code>"ACCOUNT DELETION REQUEST"</code>.
          </div>
          <p style={{ lineHeight: 1.6, fontSize: '0.88rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
            Upon account deletion, all personal profile attributes, XP points, and custom roadmaps will be permanently removed within 30 days. Cyber security logs mandated under CERT-In directives are securely retained for 180 days before automated deletion.
          </p>
        </section>

        {/* Section 7 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            7. Data Security & Storage Architecture
          </h2>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Encryption Standards:</strong> Data is encrypted at rest using AES-256 standards in cloud databases (MongoDB Atlas) and encrypted in transit using TLS 1.3 network protocols.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>CERT-In Log Retention Compliance:</strong> As required by the Indian Computer Emergency Response Team (CERT-In) under Section 70B of the Information Technology Act 2000, system access and authentication logs are retained for <strong>180 days</strong> within Indian data servers.
            </li>
          </ul>
        </section>

        {/* Section 8 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            8. Statutory Grievance Redressal Mechanism & Contact Details
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.75rem' }}>
            In accordance with Rule 3(2) of the IT (Intermediary Guidelines) Rules 2021 and Section 13 of the DPDP Act 2023, the details of the designated Grievance Officer are published below:
          </p>
          <div style={{
            backgroundColor: 'hsla(var(--text-primary) / 0.03)',
            border: '1px solid hsla(var(--border-glass))',
            padding: '1.25rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            lineHeight: '1.6'
          }}>
            <strong>Grievance Officer:</strong> Grievance Redressal & Privacy Officer<br />
            <strong>Desk / Organization:</strong> VIT Life Platform Compliance Desk<br />
            <strong>Official Email:</strong> <a href="mailto:vitlife.compliance@gmail.com" style={{ color: 'hsl(var(--primary))' }}>vitlife.compliance@gmail.com</a><br />
            <strong>Postal Address:</strong> VIT Bhopal University Campus, Kothri Kalan, Sehore, Madhya Pradesh - 466114, India.<br />
            <hr style={{ border: 'none', borderTop: '1px solid hsla(var(--border-glass))', margin: '0.75rem 0' }} />
            <strong>Statutory SLA Timelines:</strong>
            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
              <li>Acknowledgment of complaint: <strong>Within 24 Hours</strong></li>
              <li>Final resolution & response: <strong>Within 15 Days</strong></li>
            </ul>
          </div>
          <p style={{ lineHeight: 1.6, fontSize: '0.88rem', color: 'hsl(var(--text-muted))', marginTop: '0.75rem' }}>
            If your complaint remains unresolved past the 15-day statutory SLA, you have the right to file an appeal with the <strong>Data Protection Board of India</strong> or the <strong>Grievance Appellate Committee (GAC)</strong> established under the Information Technology Rules.
          </p>
        </section>

        {/* Footer Alignment */}
        <section style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1.5rem', marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent))', fontWeight: 700, marginBottom: '0.5rem' }}>
            International Standards Alignment (GDPR & CCPA)
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.88rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
            VIT Life upholds principles of data minimization, purpose limitation, storage limitation, and accountability across all international user interactions. For international data privacy queries, please reach out to our Grievance Desk.
          </p>
        </section>
      </div>
    </main>
  );
};

export default PrivacyPolicy;

