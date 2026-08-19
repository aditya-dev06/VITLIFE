import React, { useState } from 'react';
import './WhatsAppPolls.css';

export function WhatsAppPollModal({ isOpen, onClose, onSubmitPoll }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 12) {
      setError('Maximum 12 options allowed per poll.');
      return;
    }
    setOptions([...options, '']);
    setError('');
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      setError('A poll must have at least 2 options.');
      return;
    }
    const updated = options.filter((_, idx) => idx !== index);
    setOptions(updated);
    setError('');
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    const validOptions = options.map(o => o.trim()).filter(Boolean);

    if (!trimmedQuestion) {
      setError('Please enter a question.');
      return;
    }
    if (validOptions.length < 2) {
      setError('Please provide at least 2 non-empty options.');
      return;
    }

    const uniqueOptions = new Set(validOptions);
    if (uniqueOptions.size !== validOptions.length) {
      setError('Options must be unique.');
      return;
    }

    onSubmitPoll({
      question: trimmedQuestion,
      options: validOptions.map((text, idx) => ({ id: `opt_${idx}_${Date.now()}`, text })),
      allowMultipleAnswers,
    });

    setQuestion('');
    setOptions(['', '']);
    setAllowMultipleAnswers(false);
    setError('');
    onClose();
  };

  return (
    <div className="wa-poll-modal-backdrop" onClick={onClose}>
      <div className="wa-poll-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="wa-poll-modal-header">
          <div className="wa-poll-header-title">
            <span className="wa-poll-icon">📊</span>
            <h3>Create Poll</h3>
          </div>
          <button className="wa-poll-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="wa-poll-form">
          {error && <div className="wa-poll-error-banner">{error}</div>}

          {/* Question Input */}
          <div className="wa-poll-field">
            <label className="wa-poll-label">Question</label>
            <input
              type="text"
              className="wa-poll-input"
              placeholder="Ask a question..."
              maxLength={255}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              autoFocus
            />
            <span className="wa-poll-char-count">{question.length}/255</span>
          </div>

          {/* Dynamic Options Input */}
          <div className="wa-poll-field">
            <label className="wa-poll-label">Options</label>
            <div className="wa-poll-options-list">
              {options.map((opt, idx) => (
                <div key={idx} className="wa-poll-option-row">
                  <span className="wa-poll-drag-handle">⋮⋮</span>
                  <input
                    type="text"
                    className="wa-poll-input"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="wa-poll-remove-opt-btn"
                      onClick={() => handleRemoveOption(idx)}
                      title="Remove option"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 12 && (
              <button
                type="button"
                className="wa-poll-add-btn"
                onClick={handleAddOption}
              >
                <span>+</span> Add Option
              </button>
            )}
          </div>

          {/* Multi-Select Toggle Switch */}
          <div className="wa-poll-toggle-row">
            <div className="wa-poll-toggle-info">
              <span className="wa-poll-toggle-title">Allow multiple answers</span>
              <span className="wa-poll-toggle-desc">Voters can select more than one option</span>
            </div>
            <label className="wa-switch">
              <input
                type="checkbox"
                checked={allowMultipleAnswers}
                onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
              />
              <span className="wa-slider round"></span>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="wa-poll-actions">
            <button type="button" className="wa-poll-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="wa-poll-btn-submit">
              Post Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
