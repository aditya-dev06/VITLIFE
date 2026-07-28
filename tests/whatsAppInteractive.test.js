import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Helper functions mimicking WhatsApp Interactive Polls, Voice Notes, and Emoji Picker behaviors

// 1. WhatsAppPollModal Validation Logic
function validatePollCreation({ question, options, allowMultipleAnswers }) {
  const trimmedQuestion = (question || '').trim();
  const validOptions = (Array.isArray(options) ? options : []).map(o => (o || '').trim()).filter(Boolean);

  if (!trimmedQuestion) {
    return { error: 'Please enter a question.' };
  }

  if (validOptions.length < 2) {
    return { error: 'Please provide at least 2 non-empty options.' };
  }

  if (validOptions.length > 12) {
    return { error: 'Maximum 12 options allowed per poll.' };
  }

  const uniqueOptions = new Set(validOptions);
  if (uniqueOptions.size !== validOptions.length) {
    return { error: 'Options must be unique.' };
  }

  return {
    success: true,
    poll: {
      id: `poll_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      question: trimmedQuestion,
      options: validOptions.map((text, idx) => ({
        id: `opt_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text
      })),
      allowMultipleAnswers: Boolean(allowMultipleAnswers),
      votes: [],
      createdAt: new Date().toISOString()
    }
  };
}

// 2. WhatsAppPollVotingCard Vote Calculation & State Logic
function calculatePollMetrics(options, votes) {
  const counts = (options || []).map(() => 0);
  let totalVoters = 0;

  (votes || []).forEach((v, idx) => {
    if (typeof v === 'number') {
      if (counts[idx] !== undefined) counts[idx] += v;
      totalVoters += v;
    } else if (v && typeof v === 'object' && Array.isArray(v.selectedOptionIndexes)) {
      if (v.selectedOptionIndexes.length > 0) {
        v.selectedOptionIndexes.forEach((i) => {
          if (counts[i] !== undefined) {
            counts[i] += 1;
          }
        });
        totalVoters += 1;
      }
    }
  });

  const highestVoteCount = Math.max(...counts, 0);

  const optionDetails = (options || []).map((opt, idx) => {
    const count = counts[idx] || 0;
    const percentage = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
    const isLeading = count > 0 && count === highestVoteCount;
    return {
      text: typeof opt === 'string' ? opt : (opt?.text || ''),
      count,
      percentage,
      isLeading
    };
  });

  return {
    optionVoteCounts: counts,
    totalVoters,
    highestVoteCount,
    optionDetails
  };
}

function processVoteCast(poll, voteData) {
  const votes = Array.isArray(poll.votes) ? [...poll.votes] : [];
  const filteredVotes = votes.filter(v => typeof v === 'object' && String(v.userId) !== String(voteData.userId));

  if (Array.isArray(voteData.selectedOptionIndexes) && voteData.selectedOptionIndexes.length > 0) {
    filteredVotes.push(voteData);
  }

  return {
    ...poll,
    votes: filteredVotes
  };
}

// 3. WhatsAppVoterListDrawer Filter & Sanitize Logic
function sanitizeImageSrc(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return '';
}

function getVotersForOption(poll, activeTab) {
  const votes = Array.isArray(poll?.votes) ? poll.votes : [];
  const options = Array.isArray(poll?.options) ? poll.options : [];
  const safeTab = activeTab >= options.length ? 0 : activeTab;

  return votes.filter((v) =>
    v && typeof v === 'object' && Array.isArray(v.selectedOptionIndexes) && v.selectedOptionIndexes.includes(safeTab)
  );
}

// 4. Emoji Reaction Toggle Logic
function toggleEmojiReaction(reactions, messageId, emoji, userId) {
  const currentReactions = reactions || {};
  const currentList = currentReactions[emoji] || [];
  const hasReacted = currentList.includes(userId);

  const updatedList = hasReacted
    ? currentList.filter(id => id !== userId)
    : [...currentList, userId];

  return {
    ...currentReactions,
    [emoji]: updatedList
  };
}

// --- SUITE RUNNER ---

describe('WhatsApp Interactive Polls Audit & Voting Edge Cases', () => {
  describe('WhatsAppPollModal Validation', () => {
    test('rejects empty poll questions', () => {
      const res = validatePollCreation({ question: '   ', options: ['Option A', 'Option B'] });
      assert.equal(res.success, undefined);
      assert.equal(res.error, 'Please enter a question.');
    });

    test('rejects poll with less than 2 options', () => {
      const res = validatePollCreation({ question: 'Where to eat?', options: ['Pizza'] });
      assert.equal(res.error, 'Please provide at least 2 non-empty options.');
    });

    test('rejects poll with duplicate options', () => {
      const res = validatePollCreation({ question: 'Fav color?', options: ['Red', 'Red'] });
      assert.equal(res.error, 'Options must be unique.');
    });

    test('rejects poll with more than 12 options', () => {
      const opts = Array.from({ length: 13 }, (_, i) => `Option ${i + 1}`);
      const res = validatePollCreation({ question: 'Pick a number', options: opts });
      assert.equal(res.error, 'Maximum 12 options allowed per poll.');
    });

    test('successfully creates poll with unique IDs and multi-answer setting', () => {
      const res = validatePollCreation({
        question: 'Which framework do you prefer?',
        options: ['React', 'Vue', 'Svelte'],
        allowMultipleAnswers: true
      });

      assert.equal(res.success, true);
      assert.equal(res.poll.question, 'Which framework do you prefer?');
      assert.equal(res.poll.allowMultipleAnswers, true);
      assert.equal(res.poll.options.length, 3);
      assert.equal(res.poll.options[0].text, 'React');
      assert.ok(res.poll.options[0].id.startsWith('opt_0_'));
    });
  });

  describe('WhatsAppPollVotingCard Vote Calculations & Edge Cases', () => {
    const options = ['Python', 'JavaScript', 'Go', 'Rust'];

    test('calculates 0% for all options when no votes exist', () => {
      const metrics = calculatePollMetrics(options, []);
      assert.equal(metrics.totalVoters, 0);
      assert.equal(metrics.highestVoteCount, 0);
      metrics.optionDetails.forEach(opt => {
        assert.equal(opt.percentage, 0);
        assert.equal(opt.isLeading, false);
      });
    });

    test('correctly calculates single-choice poll vote percentages and leading trophy', () => {
      const votes = [
        { userId: 'u1', selectedOptionIndexes: [1] }, // JS
        { userId: 'u2', selectedOptionIndexes: [1] }, // JS
        { userId: 'u3', selectedOptionIndexes: [0] }, // Python
      ];
      const metrics = calculatePollMetrics(options, votes);
      assert.equal(metrics.totalVoters, 3);
      assert.equal(metrics.optionDetails[0].percentage, 33); // 1/3 = 33%
      assert.equal(metrics.optionDetails[1].percentage, 67); // 2/3 = 67%
      assert.equal(metrics.optionDetails[1].isLeading, true); // JS leads
      assert.equal(metrics.optionDetails[0].isLeading, false);
    });

    test('correctly handles tied vote counts for top options', () => {
      const votes = [
        { userId: 'u1', selectedOptionIndexes: [0] },
        { userId: 'u2', selectedOptionIndexes: [1] },
      ];
      const metrics = calculatePollMetrics(options, votes);
      assert.equal(metrics.totalVoters, 2);
      assert.equal(metrics.optionDetails[0].isLeading, true);
      assert.equal(metrics.optionDetails[1].isLeading, true);
      assert.equal(metrics.optionDetails[2].isLeading, false);
    });

    test('handles multi-answer voting where percentages can sum > 100%', () => {
      const votes = [
        { userId: 'u1', selectedOptionIndexes: [0, 1] }, // Python & JS
        { userId: 'u2', selectedOptionIndexes: [1, 2] }, // JS & Go
      ];
      const metrics = calculatePollMetrics(options, votes);
      assert.equal(metrics.totalVoters, 2);
      assert.equal(metrics.optionDetails[0].percentage, 50); // 1/2 = 50%
      assert.equal(metrics.optionDetails[1].percentage, 100); // 2/2 = 100%
      assert.equal(metrics.optionDetails[2].percentage, 50); // 1/2 = 50%
    });

    test('casting a vote replaces prior vote of the same user', () => {
      const initialPoll = {
        id: 'poll_1',
        options: ['Yes', 'No'],
        votes: [{ userId: 'u1', userName: 'Alice', selectedOptionIndexes: [0] }]
      };

      // Alice changes vote from Yes (0) to No (1)
      const updatedPoll = processVoteCast(initialPoll, {
        userId: 'u1',
        userName: 'Alice',
        selectedOptionIndexes: [1]
      });

      assert.equal(updatedPoll.votes.length, 1);
      assert.deepEqual(updatedPoll.votes[0].selectedOptionIndexes, [1]);
    });

    test('unselecting all options removes user vote object', () => {
      const initialPoll = {
        id: 'poll_1',
        options: ['Yes', 'No'],
        votes: [{ userId: 'u1', userName: 'Alice', selectedOptionIndexes: [0] }]
      };

      const updatedPoll = processVoteCast(initialPoll, {
        userId: 'u1',
        userName: 'Alice',
        selectedOptionIndexes: []
      });

      assert.equal(updatedPoll.votes.length, 0);
    });
  });

  describe('WhatsAppVoterListDrawer Functionality & Avatar Sanitization', () => {
    const poll = {
      id: 'poll_2',
      options: ['Option A', 'Option B'],
      votes: [
        { userId: 'u1', userName: 'Alice', userAvatar: 'A', selectedOptionIndexes: [0] },
        { userId: 'u2', userName: 'Bob', userAvatar: 'https://example.com/bob.jpg', selectedOptionIndexes: [0, 1] },
        { userId: 'u3', userName: 'Charlie', userAvatar: null, selectedOptionIndexes: [1] }
      ]
    };

    test('filters voters accurately per option tab', () => {
      const tab0Voters = getVotersForOption(poll, 0);
      const tab1Voters = getVotersForOption(poll, 1);

      assert.equal(tab0Voters.length, 2); // Alice & Bob
      assert.equal(tab1Voters.length, 2); // Bob & Charlie
      assert.equal(tab0Voters[0].userName, 'Alice');
      assert.equal(tab0Voters[1].userName, 'Bob');
    });

    test('sanitizes avatar URLs and correctly falls back for single-character initials', () => {
      assert.equal(sanitizeImageSrc('A'), ''); // Initial 'A' is not a valid URL
      assert.equal(sanitizeImageSrc('  https://example.com/avatar.png  '), 'https://example.com/avatar.png');
      assert.equal(sanitizeImageSrc('/local/path.jpg'), '/local/path.jpg');
      assert.equal(sanitizeImageSrc('javascript:alert(1)'), '');
    });

    test('safely handles out-of-bounds tab index fallback', () => {
      const voters = getVotersForOption(poll, 99); // index 99 falls back to index 0
      assert.equal(voters.length, 2);
    });
  });

  describe('Emoji Reactions & Emoji Picker Logic', () => {
    test('toggles emoji reaction on and off for a user', () => {
      let reactions = { '👍': [], '❤️': ['u2'] };

      // User u1 reacts with 👍
      reactions = toggleEmojiReaction(reactions, 'msg_1', '👍', 'u1');
      assert.deepEqual(reactions['👍'], ['u1']);

      // User u1 un-reacts with 👍
      reactions = toggleEmojiReaction(reactions, 'msg_1', '👍', 'u1');
      assert.deepEqual(reactions['👍'], []);
    });
  });
});
