import React, { useState } from 'react';
import './WhatsAppPolls.css';

export function WhatsAppVoterListDrawer({ isOpen, onClose, poll }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen || !poll) return null;

  const question = poll.question || 'Poll';
  const options = Array.isArray(poll.options) ? poll.options : [];
  const votes = Array.isArray(poll.votes) ? poll.votes : [];

  const votersForOption = votes.filter((v) =>
    v && typeof v === 'object' && Array.isArray(v.selectedOptionIndexes) && v.selectedOptionIndexes.includes(activeTab)
  );

  return (
    <div className="wa-voter-drawer-backdrop" onClick={onClose}>
      <div className="wa-voter-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="wa-voter-drawer-header">
          <button className="wa-voter-drawer-close" onClick={onClose}>✕</button>
          <div>
            <h3>Poll Details</h3>
            <span className="wa-voter-drawer-subtext">{votes.length} total votes</span>
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
              v && typeof v === 'object' && Array.isArray(v.selectedOptionIndexes) && v.selectedOptionIndexes.includes(idx)
            ).length;
            const optionLabel = typeof opt === 'string' ? opt : (opt?.text || '');
            return (
              <button
                key={opt?.id || idx}
                className={`wa-voter-tab ${activeTab === idx ? 'active' : ''}`}
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
              {votersForOption.map((voter, idx) => (
                <div key={voter.userId || idx} className="wa-voter-row">
                  <div className="wa-voter-avatar">
                    {voter.userAvatar ? (
                      <img src={voter.userAvatar} alt={voter.userName || 'User'} />
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
