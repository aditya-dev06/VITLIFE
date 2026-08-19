import { useState, useMemo } from 'react';
import './WhatsAppPolls.css';

export function WhatsAppPollVotingCard({
  poll,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserRole,
  onCastVote,
  onOpenVoterList,
}) {
  const safePoll = poll || {};
  const question = safePoll.question || 'Poll';
  const allowMultipleAnswers = Boolean(safePoll.allowMultipleAnswers);
  const options = Array.isArray(safePoll.options) ? safePoll.options : [];
  const votes = Array.isArray(safePoll.votes) ? safePoll.votes : [];

  const userVoteObj = useMemo(() => {
    if (!currentUserId) return null;
    return votes.find((v) => v && typeof v === 'object' && String(v.userId) === String(currentUserId));
  }, [votes, currentUserId]);

  const [prevUserVoteObj, setPrevUserVoteObj] = useState(userVoteObj);
  const [selectedIndexes, setSelectedIndexes] = useState(() => userVoteObj?.selectedOptionIndexes || []);

  if (userVoteObj !== prevUserVoteObj) {
    setPrevUserVoteObj(userVoteObj);
    setSelectedIndexes(userVoteObj?.selectedOptionIndexes || []);
  }

  const { optionVoteCounts, totalVoters, highestVoteCount } = useMemo(() => {
    const counts = options.map(() => 0);
    let total = 0;

    votes.forEach((v, idx) => {
      if (typeof v === 'number') {
        if (counts[idx] !== undefined) counts[idx] += v;
        total += v;
      } else if (v && typeof v === 'object' && Array.isArray(v.selectedOptionIndexes)) {
        if (v.selectedOptionIndexes.length > 0) {
          v.selectedOptionIndexes.forEach((i) => {
            if (counts[i] !== undefined) {
              counts[i] += 1;
            }
          });
          total += 1;
        }
      }
    });

    const maxVotes = Math.max(...counts, 0);
    return {
      optionVoteCounts: counts,
      totalVoters: total,
      highestVoteCount: maxVotes,
    };
  }, [options, votes]);

  const hasPendingMultiChanges = useMemo(() => {
    if (!allowMultipleAnswers) return false;
    const current = userVoteObj?.selectedOptionIndexes || [];
    if (current.length !== selectedIndexes.length) return true;
    return !current.every((val) => selectedIndexes.includes(val));
  }, [allowMultipleAnswers, userVoteObj, selectedIndexes]);

  if (!poll) return null;

  const handleToggleOption = (idx) => {
    let updated;
    if (allowMultipleAnswers) {
      if (selectedIndexes.includes(idx)) {
        updated = selectedIndexes.filter((i) => i !== idx);
      } else {
        updated = [...selectedIndexes, idx];
      }
    } else {
      updated = [idx];
    }
    setSelectedIndexes(updated);

    if (!allowMultipleAnswers && onCastVote) {
      onCastVote(poll.id, {
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        userRole: currentUserRole,
        selectedOptionIndexes: updated,
        votedAt: new Date().toISOString(),
      });
    }
  };

  const handleMultiSubmit = () => {
    if (onCastVote) {
      onCastVote(poll.id, {
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        userRole: currentUserRole,
        selectedOptionIndexes: selectedIndexes,
        votedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="wa-poll-card">
      {/* Poll Header */}
      <div className="wa-poll-card-header">
        <h4 className="wa-poll-question">{question}</h4>
        <div className="wa-poll-badge-row">
          <span className="wa-poll-type-badge">
            {allowMultipleAnswers ? 'Select one or more' : 'Select one'}
          </span>
          <span className="wa-poll-voter-count">
            {totalVoters} {totalVoters === 1 ? 'vote' : 'votes'}
          </span>
        </div>
      </div>

      {/* Options & Progress Bars */}
      <div className="wa-poll-card-options">
        {options.map((opt, idx) => {
          const count = optionVoteCounts[idx] || 0;
          const percentage = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
          const isSelected = selectedIndexes.includes(idx);
          const isLeading = count > 0 && count === highestVoteCount;
          const optionText = typeof opt === 'string' ? opt : (opt?.text || '');

          return (
            <div
              key={opt?.id || idx}
              className={`wa-poll-option-item ${isSelected ? 'selected' : ''} ${isLeading ? 'leading' : ''}`}
              onClick={() => handleToggleOption(idx)}
            >
              {/* Option Progress Bar Background Fill */}
              <div
                className="wa-poll-progress-fill"
                style={{ width: `${percentage}%` }}
              />

              {/* Foreground Details */}
              <div className="wa-poll-option-content">
                <div className="wa-poll-option-left">
                  {allowMultipleAnswers ? (
                    <div className={`wa-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <span>✓</span>}
                    </div>
                  ) : (
                    <div className={`wa-radio ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <div className="wa-radio-inner" />}
                    </div>
                  )}
                  <span className="wa-poll-option-text">{optionText}</span>
                </div>

                <div className="wa-poll-option-right">
                  {isLeading && <span className="wa-poll-leading-star" title="Top voted option">🏆</span>}
                  <span className="wa-poll-option-percent">{percentage}%</span>
                  <span className="wa-poll-option-votes-count">({count})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-Select Submit Button */}
      {allowMultipleAnswers && hasPendingMultiChanges && (
        <button className="wa-poll-submit-vote-btn" onClick={handleMultiSubmit}>
          Submit Vote
        </button>
      )}

      {/* Footer Link to Drawer */}
      <div className="wa-poll-card-footer">
        <button
          className="wa-poll-view-votes-btn"
          onClick={() => onOpenVoterList && onOpenVoterList(poll)}
        >
          View Votes ({totalVoters})
        </button>
      </div>
    </div>
  );
}
