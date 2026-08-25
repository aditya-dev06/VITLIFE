import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, ArrowRight, Bot, Lock } from 'lucide-react';

export default function WhatsAppNotificationBanner({ notification, onOpenChat, onClose }) {
  if (!notification) return null;

  const {
    id,
    author = 'Student',
    avatar,
    content = '',
    channel = 'general',
    isDm = false,
    isAi = false,
    timestamp = 'Just now'
  } = notification;

  const handleBannerClick = (e) => {
    e.stopPropagation();
    if (onOpenChat) {
      onOpenChat(notification);
    }
  };

  const handleClose = (e) => {
    e.stopPropagation();
    if (onClose) onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key={id || 'chat-notification'}
        initial={{ opacity: 0, y: -70, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        onClick={handleBannerClick}
        style={{
          position: 'fixed',
          top: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          width: '92%',
          maxWidth: '440px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '16px',
            background: 'rgba(17, 24, 39, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(37, 211, 102, 0.25)',
            color: '#f3f4f6'
          }}
        >
          {/* Avatar / Bot Badge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: isAi 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: isAi ? '1.25rem' : '1.05rem',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
              }}
            >
              {avatar || author.charAt(0).toUpperCase()}
            </div>
            {/* WhatsApp Green Online / Message Indicator Dot */}
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#25D366',
                border: '2px solid #111827'
              }}
            />
          </div>

          {/* Message Information */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <span
                  style={{
                    fontWeight: '700',
                    fontSize: '0.92rem',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {author}
                </span>

                {isAi && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '1px 5px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Bot size={10} /> AI
                  </span>
                )}

                {isDm && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '1px 5px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      background: 'rgba(139, 92, 246, 0.2)',
                      color: '#a78bfa',
                      border: '1px solid rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <Lock size={10} /> DM
                  </span>
                )}
              </div>

              <span style={{ fontSize: '0.72rem', color: '#9ca3af', flexShrink: 0 }}>
                {timestamp}
              </span>
            </div>

            {/* Channel context + message preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {!isDm && (
                <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: '600' }}>
                  #{channel}:
                </span>
              )}
              <p
                style={{
                  margin: 0,
                  fontSize: '0.84rem',
                  color: '#d1d5db',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3
                }}
              >
                {content || 'Sent an attachment'}
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={handleBannerClick}
              aria-label="Open Chat"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '10px',
                background: '#25D366',
                color: '#000000',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#20bd5a')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#25D366')}
            >
              Reply <ArrowRight size={12} />
            </button>

            <button
              onClick={handleClose}
              aria-label="Dismiss Notification"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#9ca3af',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
