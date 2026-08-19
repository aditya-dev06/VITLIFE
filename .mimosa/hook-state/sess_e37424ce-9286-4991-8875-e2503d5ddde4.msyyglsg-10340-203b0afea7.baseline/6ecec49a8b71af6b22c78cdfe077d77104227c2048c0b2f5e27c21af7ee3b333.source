import React, { useState, useEffect, useRef } from 'react';
import './MetaAIDrawer.css';

export function MetaAIDrawer({ isOpen, onClose, targetMessage, activeChannel, onSelectQuickReply }) {
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [followUps, setFollowUps] = useState([]);
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const bodyRef = useRef(null);

  // Fetch initial Meta AI analysis when drawer opens or message changes
  useEffect(() => {
    if (!isOpen || !targetMessage) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setAiData(null);
    setFollowUps([]);
    setUserPrompt('');

    const fetchAnalysis = async () => {
      try {
        const response = await fetch('/api/chat/meta-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageContent: targetMessage.content || 'Attachment / Media update',
            author: targetMessage.author || 'Student',
            channel: activeChannel || 'general'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to reach Meta AI service');
        }

        const data = await response.json();
        if (isMounted) {
          if (data.success) {
            setAiData(data);
          } else {
            setError(data.error || 'Could not analyze message');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error connecting to Meta AI assistant.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalysis();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetMessage, activeChannel]);

  // Scroll to bottom when new follow-up responses arrive
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [followUps, aiData]);

  if (!isOpen || !targetMessage) return null;

  const handleQuickReplyClick = (replyText) => {
    if (onSelectQuickReply) {
      onSelectQuickReply(replyText, targetMessage);
    }
    setToastMessage(`✓ Quick reply applied: "${replyText}"`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    if (!userPrompt.trim() || submittingFollowUp) return;

    const queryText = userPrompt.trim();
    setUserPrompt('');
    setSubmittingFollowUp(true);

    // Append user question immediately
    setFollowUps((prev) => [...prev, { sender: 'user', text: queryText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

    try {
      const response = await fetch('/api/chat/meta-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent: targetMessage.content || '',
          author: targetMessage.author || 'Student',
          channel: activeChannel || 'general',
          prompt: queryText
        })
      });

      const data = await response.json();
      if (data.success) {
        setFollowUps((prev) => [
          ...prev,
          {
            sender: 'meta',
            text: data.aiResponse || data.summary,
            quickReplies: data.quickReplies,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setFollowUps((prev) => [
          ...prev,
          {
            sender: 'meta',
            text: 'Apologies, I encountered an issue processing your follow-up query.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setFollowUps((prev) => [
        ...prev,
        {
          sender: 'meta',
          text: 'Error connecting to Meta AI assistant. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  return (
    <div className="meta-ai-drawer-backdrop" onClick={onClose}>
      <div className="meta-ai-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="meta-ai-drawer-header">
          <div className="meta-ai-header-left">
            <div className="meta-ai-orb-logo">✨</div>
            <div>
              <h3 className="meta-ai-header-title">Meta AI Assistant</h3>
              <div className="meta-ai-header-subtext">
                Analyzing post in #{activeChannel || 'general'}
              </div>
            </div>
          </div>
          <button className="meta-ai-close-btn" onClick={onClose} title="Close Meta AI Drawer">
            ✕
          </button>
        </div>

        {/* Quoted Target Message */}
        <div className="meta-ai-quoted-card">
          <div className="meta-ai-quoted-author">
            <span>Target Message from {targetMessage.author || 'Student'}</span>
            <span>{targetMessage.timestamp ? new Date(targetMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
          <div className="meta-ai-quoted-text">
            "{targetMessage.content || 'Attachment / Media update'}"
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="meta-ai-drawer-body" ref={bodyRef}>
          {/* Toast Notification */}
          {toastMessage && (
            <div className="meta-ai-toast-banner">
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Loading Shimmer State */}
          {loading && (
            <div className="meta-ai-loading-container">
              <div className="meta-ai-loading-orb-bar">
                <div className="meta-ai-pulsing-dot" />
                <span>Meta AI is generating smart summary & insights...</span>
              </div>
              <div className="meta-ai-shimmer-box" />
              <div className="meta-ai-shimmer-box" style={{ height: '110px' }} />
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="meta-ai-summary-card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' }}>
              <div className="meta-ai-section-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>
                ⚠️ Notice
              </div>
              <p className="meta-ai-summary-text" style={{ color: '#fca5a5' }}>
                {error}
              </p>
            </div>
          )}

          {/* AI Analysis Cards */}
          {!loading && aiData && (
            <>
              {/* 1. Smart Summary Card */}
              {aiData.summary && (
                <div className="meta-ai-summary-card">
                  <div className="meta-ai-section-badge badge-summary">
                    ⚡ Smart Summary
                  </div>
                  <p className="meta-ai-summary-text">{aiData.summary}</p>
                </div>
              )}

              {/* 2. Key Insights Card */}
              {Array.isArray(aiData.keyInsights) && aiData.keyInsights.length > 0 && (
                <div className="meta-ai-insights-card">
                  <div className="meta-ai-section-badge badge-insights">
                    💡 Key Insights
                  </div>
                  <ul className="meta-ai-insights-list">
                    {aiData.keyInsights.map((insight, idx) => (
                      <li key={idx} className="meta-ai-insight-item">
                        <span className="meta-ai-insight-icon">✦</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. Detailed AI Response */}
              {aiData.aiResponse && (
                <div className="meta-ai-response-box">
                  <div className="meta-ai-section-badge badge-summary" style={{ marginBottom: '0.6rem' }}>
                    🤖 Meta AI Analysis
                  </div>
                  {aiData.aiResponse}
                </div>
              )}

              {/* 4. 1-Click Quick Replies */}
              {Array.isArray(aiData.quickReplies) && aiData.quickReplies.length > 0 && (
                <div className="meta-ai-quick-card">
                  <div className="meta-ai-section-badge badge-quick">
                    💬 1-Click Quick Replies
                  </div>
                  <div className="meta-ai-quick-chips">
                    {aiData.quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        className="meta-ai-quick-btn"
                        onClick={() => handleQuickReplyClick(reply)}
                        title="Click to insert as chat reply"
                      >
                        <span>"{reply}"</span>
                        <span className="meta-ai-quick-arrow">↵</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Follow-up Threads */}
          {followUps.length > 0 && (
            <div className="meta-ai-chat-thread">
              {followUps.map((msg, index) => (
                <div
                  key={index}
                  className={msg.sender === 'user' ? 'meta-ai-user-bubble' : 'meta-ai-assistant-bubble'}
                >
                  <div style={{ fontSize: '0.74rem', opacity: 0.7, marginBottom: '0.2rem' }}>
                    {msg.sender === 'user' ? 'You' : 'Meta AI'} • {msg.timestamp}
                  </div>
                  <div>{msg.text}</div>

                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {msg.quickReplies.map((r, i) => (
                        <button
                          key={i}
                          className="meta-ai-quick-btn"
                          onClick={() => handleQuickReplyClick(r)}
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                        >
                          <span>"{r}"</span>
                          <span className="meta-ai-quick-arrow">↵</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {submittingFollowUp && (
            <div className="meta-ai-assistant-bubble" style={{ opacity: 0.8 }}>
              <div className="meta-ai-loading-orb-bar" style={{ fontSize: '0.8rem' }}>
                <div className="meta-ai-pulsing-dot" />
                <span>Meta AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Input */}
        <div className="meta-ai-drawer-footer">
          <form className="meta-ai-input-form" onSubmit={handleFollowUpSubmit}>
            <input
              type="text"
              className="meta-ai-input-field"
              placeholder="Ask Meta AI follow-up questions..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              disabled={submittingFollowUp || loading}
            />
            <button
              type="submit"
              className="meta-ai-send-btn"
              disabled={!userPrompt.trim() || submittingFollowUp || loading}
              title="Send to Meta AI"
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
