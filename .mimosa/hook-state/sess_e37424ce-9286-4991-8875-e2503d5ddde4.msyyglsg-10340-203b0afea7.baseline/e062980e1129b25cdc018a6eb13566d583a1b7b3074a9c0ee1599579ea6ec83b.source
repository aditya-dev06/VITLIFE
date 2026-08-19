export default function FullPageLoader({ text = "Initializing Campus Hub..." }) {
  return (
    <div 
      role="status"
      aria-live="polite"
      aria-label="Loading application content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090B',
        color: '#FFFFFF',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 99999,
        overflow: 'hidden'
      }}
    >
      {/* Background ambient subtle glow */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0) 70%)',
        animation: 'pulseGlow 3s ease-in-out infinite'
      }} />

      {/* Main Glass Card Container */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 3rem',
        borderRadius: '24px',
        background: 'rgba(18, 18, 22, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }}>
        {/* Brand Header Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2rem'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 10px #10B981',
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
          }} />
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            VIT LIFE
          </span>
        </div>

        {/* Animated Glowing Dual Ring Spinner */}
        <div style={{
          position: 'relative',
          width: '56px',
          height: '56px',
          marginBottom: '1.75rem'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(255, 255, 255, 0.08)',
            borderTopColor: '#FFFFFF',
            animation: 'spin 0.9s linear infinite',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.15)'
          }} />
          <div style={{
            position: 'absolute',
            inset: '6px',
            borderRadius: '50%',
            border: '2px solid transparent',
            borderBottomColor: 'rgba(255, 255, 255, 0.4)',
            animation: 'spinReverse 1.4s linear infinite'
          }} />
        </div>

        {/* Animated Subtitle Text */}
        <div style={{
          fontSize: '0.95rem',
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: 'rgba(255, 255, 255, 0.85)',
          animation: 'fadeInOut 2s ease-in-out infinite'
        }}>
          {text}
        </div>
      </div>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
