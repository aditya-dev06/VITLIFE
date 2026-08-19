import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('vitlife_consent_accepted');
    if (!consent) {
      // Show consent banner after a short smooth delay
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('vitlife_consent_accepted', 'true');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Privacy & Cookie Consent Banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'calc(100% - 2rem)',
            maxWidth: '540px',
            backgroundColor: 'rgba(15, 18, 28, 0.95)',
            backdropFilter: 'blur(20px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '1.1rem 1.25rem',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <div 
              style={{
                fontSize: '1.4rem',
                lineHeight: 1,
                padding: '0.35rem',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                borderRadius: '10px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                flexShrink: 0
              }}
              aria-hidden="true"
            >
              🛡️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, letterSpacing: '0.01em', marginBottom: '0.25rem', color: '#ffffff' }}>
                VIT Life Privacy & Local Storage
              </div>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.45, margin: '0 0 0.85rem 0' }}>
                We use local storage and essential cookies to save your timetable, mess menu preferences, and active season data directly on your device.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleAccept}
                  aria-label="Accept and continue with essential local storage"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.45rem 1.1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'transform 0.15s, background-color 0.15s'
                  }}
                >
                  Accept & Continue
                </button>
                <a
                  href="#privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open-privacy-policy'));
                  }}
                  aria-label="Learn more about our privacy policy"
                  style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.78rem',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
