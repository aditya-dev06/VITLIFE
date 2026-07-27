
const TermsAndConditions = () => {
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
              Terms & Conditions
            </h1>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
              Last Updated: July 26, 2026 • Statutory Compliance Version 3.0 (DPDP Act 2023 & IT Rules Compliant)
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

        {/* Introduction */}
        <section style={{ marginBottom: '2rem' }}>
          <p style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
            Welcome to <strong>VIT Life</strong> (referred to as the "Platform", "Service", "we", "us", or "our"). VIT Life is an academic roadmap tracker, student community hub, and campus engagement network for members of VIT Bhopal University.
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.95rem', color: 'hsl(var(--text-muted))' }}>
            By registering for an account, downloading, or using the Platform, you acknowledge that you have read, understood, and agree to be legally bound by these Terms & Conditions, the Privacy Policy, and all applicable statutory frameworks, including the <strong>Indian Information Technology Act, 2000</strong>, the <strong>IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (as amended in 2022 and 2023)</strong>, the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, and <strong>Google Play Developer Policies</strong>.
          </p>
        </section>

        {/* Section 1 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            1. User Eligibility, Account Registration & Minors
          </h2>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Eligibility & Institutional Verification:</strong> Registration is restricted to active students, faculty, club managers, and authorized administrators of VIT Bhopal University. Access requires verification via a valid institutional email domain (<code>@vitbhopal.ac.in</code>).
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Minors & Age Requirement (DPDP Sec 9):</strong> Users under 18 years of age ("Minors") must register only with verifiable parental or legal guardian consent. Parents/guardians assume full legal responsibility for a minor's compliance with these Terms.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Credential Protection:</strong> You are strictly responsible for maintaining account confidentiality. Any activities originating under your verified credentials are deemed to be authorized by you.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            2. Code of Conduct & Mandatory Prohibited Content (IT Rules 2021, Rule 3(1)(b))
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.75rem' }}>
            In strict compliance with Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (as amended), you agree that you shall <strong>NOT host, display, upload, modify, publish, transmit, store, update or share</strong> any information that:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.4rem' }}>Belongs to another person and to which you do not have any right.</li>
            <li style={{ marginBottom: '0.4rem' }}>Is grossly harmful, harassing, blasphemous, defamatory, obscene, pornographic, pedophilic, libelous, invasive of another's privacy, hateful, racially or ethnically objectionable, disparaging, or unlawful in any manner.</li>
            <li style={{ marginBottom: '0.4rem' }}>Is harmful to minors in any way.</li>
            <li style={{ marginBottom: '0.4rem' }}>Infringes any patent, trademark, copyright, or other proprietary rights of any entity.</li>
            <li style={{ marginBottom: '0.4rem' }}>Violates any law for the time being in force in the Republic of India.</li>
            <li style={{ marginBottom: '0.4rem' }}>Deceives or misleads the addressee about the origin of the message, or knowingly communicates any grossly offensive or menacing information.</li>
            <li style={{ marginBottom: '0.4rem' }}>Impersonates another person or entity.</li>
            <li style={{ marginBottom: '0.4rem' }}>Contains software viruses, malware, trojans, or any computer code designed to interrupt, destroy, or limit the functionality of any computer resource.</li>
            <li style={{ marginBottom: '0.4rem' }}>Threatens the unity, integrity, defense, security, or sovereignty of India, friendly relations with foreign states, or public order, or causes incitement to any cognizable offense.</li>
            <li style={{ marginBottom: '0.4rem' }}>Contains fake news, misinformation, or content declared as false/misleading by authorized government fact-check units.</li>
            <li style={{ marginBottom: '0.4rem' }}>Promotes online real-money gambling, illegal betting, or unauthorized online gaming.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            3. Duties of Data Principals & Statutory Penalties (DPDP Act 2023, Sec 15)
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            Under Section 15 of the Digital Personal Data Protection Act, 2023, every user acting as a Data Principal must adhere to the following statutory duties:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.4rem' }}><strong>Compliance with Laws:</strong> Comply with provisions of all applicable laws while exercising rights under the DPDP Act.</li>
            <li style={{ marginBottom: '0.4rem' }}><strong>No Impersonation:</strong> Do not impersonate another person while submitting personal data.</li>
            <li style={{ marginBottom: '0.4rem' }}><strong>No Suppression of Information:</strong> Do not suppress any material information while providing personal data for registration or profile creation.</li>
            <li style={{ marginBottom: '0.4rem' }}><strong>No Frivolous Complaints:</strong> Do not register false, frivolous, or vexatious grievances with the Grievance Officer or the Data Protection Board.</li>
          </ul>
          <div style={{ backgroundColor: 'rgba(255, 107, 107, 0.08)', borderLeft: '4px solid #ff6b6b', padding: '0.75rem 1rem', borderRadius: '4px', marginTop: '0.75rem', fontSize: '0.88rem' }}>
            ⚠️ <strong>Statutory Penalty Notice:</strong> Under Section 15 read with the Schedule of the DPDP Act 2023, violation of Data Principal duties may attract statutory penalties of up to <strong>₹10,000 (Rupees Ten Thousand)</strong> per violation.
          </div>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            4. Intellectual Property Rights & Limited License
          </h2>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6, fontSize: '0.92rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Platform Property:</strong> Software code, UI designs, brand logos, course roadmap databases, and platform infrastructure remain the exclusive intellectual property of VIT Life.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>User Content License:</strong> By posting event notices, club posters, or project details, you grant VIT Life a worldwide, non-exclusive, royalty-free license to host, index, display, and distribute such content solely for platform operations.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            5. Intermediary Status (IT Act Sec 79), Takedowns & User Absolute Liability
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '1rem' }}>
            <strong>Intermediary Safe Harbor (Section 79):</strong> VIT Life acts strictly as an "Intermediary" under Section 79 of the Information Technology Act, 2000. We function as a passive technical platform for user-generated academic roadmaps, student club announcements, and community discussions. We do not pre-screen or exercise editorial control over user submissions.
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '1rem' }}>
            <strong>Statutory Takedown Obligation (Rule 3(1)(j)):</strong> Upon receiving actual knowledge in the form of a court order or notification from an authorized government agency regarding unlawful content, we will disable access to such material within <strong>36 hours</strong> in accordance with statutory guidelines.
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '1rem' }}>
            <strong>User Absolute Liability:</strong> Any user who uploads, publishes, or transmits content on the Platform assumes <strong>sole, absolute, 100% civil and criminal legal liability</strong> for any infringement, defamation, obscenity, or breach of law resulting from their post. Developers and administrators of VIT Life are fully indemnified against all claims, losses, or legal actions.
          </p>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            6. Account Termination & Deletion (Google Play Compliance)
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
            We reserve the right to suspend or terminate accounts immediately for breach of these Terms, non-compliance with University regulations, or malicious API tampering. In accordance with Google Play policies, users may also voluntarily request complete account deletion at any time via <em>Profile Settings → Edit Profile → Delete My Account</em> or by emailing <a href="mailto:vitlife.compliance@gmail.com" style={{ color: 'hsl(var(--primary))' }}>vitlife.compliance@gmail.com</a>.
          </p>
        </section>

        {/* Section 7 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            7. Statutory Grievance Redressal & Appeal Mechanism (IT Rules 2021 & DPDP Act)
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '0.75rem' }}>
            Pursuant to Rule 3(2) of the IT (Intermediary Guidelines) Rules 2021 and Section 13 of the DPDP Act 2023, complaints or grievances regarding content or data privacy may be submitted to our designated officer:
          </p>
          <div style={{
            backgroundColor: 'hsla(var(--text-primary) / 0.03)',
            border: '1px solid hsla(var(--border-glass))',
            padding: '1.25rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            lineHeight: '1.6'
          }}>
            <strong>Grievance Officer:</strong> Grievance Redressal & Compliance Officer<br />
            <strong>Official Desk:</strong> VIT Life Platform Legal & Compliance Desk<br />
            <strong>Email:</strong> <a href="mailto:vitlife.compliance@gmail.com" style={{ color: 'hsl(var(--primary))' }}>vitlife.compliance@gmail.com</a><br />
            <strong>Address:</strong> VIT Bhopal University Campus, Kothri Kalan, Sehore, Madhya Pradesh - 466114, India.<br />
            <hr style={{ border: 'none', borderTop: '1px solid hsla(var(--border-glass))', margin: '0.75rem 0' }} />
            <strong>Statutory SLA Timelines:</strong>
            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
              <li>Complaint Acknowledgment: <strong>Within 24 Hours</strong></li>
              <li>Complaint Resolution: <strong>Within 15 Days</strong></li>
            </ul>
          </div>
          <p style={{ lineHeight: 1.6, fontSize: '0.88rem', color: 'hsl(var(--text-muted))', marginTop: '0.75rem' }}>
            <strong>Escalation / Appeal Rights:</strong> If you are aggrieved by a decision of the Grievance Officer, you may file an appeal before the statutory <strong>Grievance Appellate Committee (GAC)</strong> established by the Government of India under IT Rule 3A, or approach the <strong>Data Protection Board of India</strong> under DPDP Act 2023.
          </p>
        </section>

        {/* Section 8 */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'hsl(var(--secondary))', fontWeight: 700, marginBottom: '0.75rem' }}>
            8. Governing Law & Exclusive Jurisdiction
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
            These Terms & Conditions are governed by and construed in accordance with the laws of the <strong>Republic of India</strong>. Any dispute, suit, or legal proceeding arising out of or relating to the Platform shall be subject to the exclusive jurisdiction of the competent courts in <strong>Bhopal, Madhya Pradesh, India</strong>.
          </p>
        </section>

        {/* Footer Contact */}
        <section style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1.5rem', marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: 'hsl(var(--accent))', fontWeight: 700, marginBottom: '0.5rem' }}>
            Legal Notice & Official Contact
          </h2>
          <p style={{ lineHeight: 1.6, fontSize: '0.88rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
            For legal inquiries or statutory correspondence, please contact: <a href="mailto:vitlife.compliance@gmail.com" style={{ color: 'hsl(var(--primary))', textDecoration: 'underline' }}>vitlife.compliance@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
};

export default TermsAndConditions;

