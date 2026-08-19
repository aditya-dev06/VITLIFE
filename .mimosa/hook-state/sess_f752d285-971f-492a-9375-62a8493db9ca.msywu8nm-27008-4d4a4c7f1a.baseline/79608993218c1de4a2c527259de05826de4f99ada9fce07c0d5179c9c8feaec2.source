import { useState, useMemo } from 'react';
import './ForwardMessageModal.css';

const ALL_CHANNELS = [
  { id: 'general', label: '#general-discussion', icon: '💬' },
  { id: 'pyq-doubts', label: '#pyq-doubt-solver', icon: '📄' },
  { id: 'exam-prep', label: '#exam-prep-groups', icon: '📚' },
  { id: 'buy-sell', label: '#campus-buy-sell', icon: '🛍️' },
  { id: 'placements', label: '#placements-internships', icon: '💼' },
  { id: 'lost-found', label: '#lost-and-found', icon: '🔍' },
];

export function ForwardMessageModal({ isOpen, message, onClose, onForward }) {
  const [selected, setSelected] = useState([]);
  const [searchQ, setSearchQ] = useState('');

  const filtered = useMemo(() =>
    ALL_CHANNELS.filter(c => c.label.toLowerCase().includes(searchQ.toLowerCase())),
    [searchQ]
  );

  if (!isOpen || !message) return null;

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleForward = () => {
    if (selected.length === 0) return;
    onForward && onForward(message, selected);
    setSelected([]);
    setSearchQ('');
    onClose();
  };

  return (
    <div className="fwd-overlay" onClick={onClose}>
      <div className="fwd-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="fwd-header">
          <div className="fwd-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
            </svg>
            Forward Message
          </div>
          <button className="fwd-close" onClick={onClose}>✕</button>
        </div>

        {/* Message Preview */}
        <div className="fwd-preview">
          <div className="fwd-preview-author">{message.author}</div>
          <div className="fwd-preview-content">
            {message.poll ? `📊 Poll: ${message.poll.question}` :
             message.isAudio ? '🎙️ Voice note' :
             message.attachment ? '📎 Attachment' :
             (message.content || '').slice(0, 100)}
          </div>
        </div>

        {/* Search */}
        <div className="fwd-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8696a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="fwd-search"
            type="text"
            placeholder="Search channels..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
        </div>

        {/* Channel List */}
        <div className="fwd-channel-list">
          {filtered.map(ch => (
            <div
              key={ch.id}
              className={`fwd-channel-row ${selected.includes(ch.id) ? 'fwd-selected' : ''}`}
              onClick={() => toggle(ch.id)}
            >
              <span className="fwd-ch-icon">{ch.icon}</span>
              <span className="fwd-ch-label">{ch.label}</span>
              <div className={`fwd-check ${selected.includes(ch.id) ? 'fwd-check-active' : ''}`}>
                {selected.includes(ch.id) && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="fwd-footer">
          {selected.length > 0 && (
            <span className="fwd-count">{selected.length} channel{selected.length > 1 ? 's' : ''} selected</span>
          )}
          <button
            className="fwd-btn-send"
            disabled={selected.length === 0}
            onClick={handleForward}
          >
            Forward
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
