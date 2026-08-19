import React, { useState } from 'react';
import './WhatsAppPolls.css';

const sanitizeImageSrc = (url) => {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return '';
};

export function WhatsAppVoterListDrawer({ isOpen, onClose, poll }) {
  const [activeTab, setActiveTab] = useState(0);

  const safePoll = poll || {};
  const question = safePoll.question || 'Poll';
  const options = Array.isArray(safePoll.options) ? safePoll.options : [];
  const votes = Array.isArray(safePoll.votes) ? safePoll.votes : [];

  const totalVoterCount = React.useMemo(() => {
    let count = 0;
    votes.forEach(v => {
      if (typeof v === 'number') count += v;
      else if (v && typeof v === 'object' && Array.isArray(v.selectedOptionIndexes) && v.selectedOptionIndexes.length > 0) count += 1;
    });
    return count;
  }, [votes]);

  if (!isOpen || !poll) return null;

  const safeActiveTab = activeTab >= options.length ? 0 : activeTab;

  const votersForOption = votes.filter((v) =>
    v && typeof v === 'object' && Array.isArray(v.selectedOptionIndexes) && v.selectedOptionIndexes.includes(safeActiveTab)
  );

  return (
    <div className="wa-voter-drawer-backdrop" onClick={onClose}>
      <div className="wa-voter-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="wa-voter-drawer-header">
          <button className="wa-voter-drawer-close" onClick={onClose}>✕</button>
          <div>
            <h3>Poll Details</h3>
            <span className="wa-voter-drawer-subtext">{totalVoterCount} {totalVoterCount === 1 ? 'vote' : 'votes'}</span>
          </div>
        </div>

        {/* Question Title */}
        <div className="wa-voter-drawer-question-box">
          <h4>{question}</h4>
        </div>

        {/* Option Tabs */}
        <div className="wa-voter-tabs-scroll">
          {options.map((opt, idx) => {
            const count = votes.filter((v) =>
              typeof v === 'number'
                ? false
                : v && typeof v === 'object' && Array.isArray(v.selectedOptionIndexes) && v.selectedOptionIndexes.includes(idx)
            ).length;
            const optionLabel = typeof opt === 'string' ? opt : (opt?.text || '');
            return (
              <button
                key={opt?.id || idx}
                className={`wa-voter-tab ${safeActiveTab === idx ? 'active' : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                <span>{optionLabel}</span>
                <span className="wa-voter-tab-badge">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Voters List Container */}
        <div className="wa-voter-list-container">
          <div className="wa-voter-list-header">
            <span>Voters ({votersForOption.length})</span>
          </div>

          {votersForOption.length === 0 ? (
            <div className="wa-voter-empty-state">
              <span>No votes cast for this option yet.</span>
            </div>
          ) : (
            <div className="wa-voter-user-rows">
              {votersForOption.map((voter, idx) => {
                const cleanAvatar = sanitizeImageSrc(voter.userAvatar);
                return (
                  <div key={voter.userId || idx} className="wa-voter-row">
                    <div className="wa-voter-avatar">
                      {cleanAvatar ? (
                        <img src={cleanAvatar} alt={voter.userName || 'User'} />
                      ) : (
                        <span>{(voter.userName || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="wa-voter-user-info">
                      <div className="wa-voter-name-row">
                        <span className="wa-voter-name">{voter.userName || 'Anonymous'}</span>
                        {voter.userRole && (
                          <span className="wa-voter-role-badge">{voter.userRole}</span>
                        )}
                      </div>
                      <span className="wa-voter-time">
                        {voter.votedAt ? new Date(voter.votedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
