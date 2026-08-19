import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Unit tests for Message Editing & Version History logic

describe('Message Editing & Version History Logic', () => {
  function processMessageEdit(existingMsg, newContent, userId, isAdmin) {
    if (!newContent || !newContent.trim()) {
      return { error: 'Message content cannot be empty', status: 400 };
    }

    const isOwner = isAdmin || (userId && String(existingMsg.authorId) === String(userId)) || (userId && String(existingMsg.author) === String(userId));
    if (!isOwner) {
      return { error: 'Unauthorized to edit this message', status: 403 };
    }

    const now = new Date().toISOString();
    const previousContent = existingMsg.content;
    const previousEditedAt = existingMsg.editedAt || existingMsg.updatedAt || existingMsg.timestamp || now;
    const editHistory = Array.isArray(existingMsg.editHistory) ? [...existingMsg.editHistory] : [];
    
    editHistory.push({
      content: previousContent,
      editedAt: previousEditedAt
    });

    const updatedMessage = {
      ...existingMsg,
      content: newContent.trim(),
      isEdited: true,
      editedAt: now,
      updatedAt: now,
      editHistory
    };

    return {
      status: 200,
      success: true,
      message: 'Message updated successfully',
      data: updatedMessage
    };
  }

  test('successfully edits message content and maintains version history', () => {
    const originalMsg = {
      id: 'msg_101',
      authorId: 'user_1',
      author: 'Alice',
      content: 'Original hello world',
      timestamp: '2026-07-28T10:00:00.000Z'
    };

    const res1 = processMessageEdit(originalMsg, 'First edit', 'user_1', false);
    assert.equal(res1.status, 200);
    assert.equal(res1.data.content, 'First edit');
    assert.equal(res1.data.isEdited, true);
    assert.equal(res1.data.editHistory.length, 1);
    assert.equal(res1.data.editHistory[0].content, 'Original hello world');

    const res2 = processMessageEdit(res1.data, 'Second edit', 'user_1', false);
    assert.equal(res2.status, 200);
    assert.equal(res2.data.content, 'Second edit');
    assert.equal(res2.data.isEdited, true);
    assert.equal(res2.data.editHistory.length, 2);
    assert.equal(res2.data.editHistory[0].content, 'Original hello world');
    assert.equal(res2.data.editHistory[1].content, 'First edit');
  });

  test('allows admin to edit messages written by other users', () => {
    const msg = {
      id: 'msg_102',
      authorId: 'user_1',
      author: 'Alice',
      content: 'User post',
      timestamp: '2026-07-28T10:00:00.000Z'
    };

    const res = processMessageEdit(msg, 'Admin moderated text', 'admin_99', true);
    assert.equal(res.status, 200);
    assert.equal(res.data.content, 'Admin moderated text');
    assert.equal(res.data.isEdited, true);
  });

  test('rejects edits from unauthorized non-owner users', () => {
    const msg = {
      id: 'msg_103',
      authorId: 'user_1',
      author: 'Alice',
      content: 'Private post',
      timestamp: '2026-07-28T10:00:00.000Z'
    };

    const res = processMessageEdit(msg, 'Hacked text', 'user_2', false);
    assert.equal(res.status, 403);
    assert.equal(res.error, 'Unauthorized to edit this message');
  });

  test('rejects empty message content', () => {
    const msg = {
      id: 'msg_104',
      authorId: 'user_1',
      author: 'Alice',
      content: 'Valid post'
    };

    const res = processMessageEdit(msg, '   ', 'user_1', false);
    assert.equal(res.status, 400);
    assert.equal(res.error, 'Message content cannot be empty');
  });
});
