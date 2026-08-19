import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Re-implement the exact isGifUrl function from CommunityPage.jsx to unit test its logic
const isGifUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.includes('.gif') || trimmed.includes('image/gif') || trimmed.startsWith('data:image/gif')) return true;
  try {
    const u = new URL(trimmed);
    const host = u.hostname;
    return host === 'giphy.com' || host.endsWith('.giphy.com') || host === 'media.giphy.com';
  } catch {
    return false;
  }
};

describe('GIF Url Detection Logic', () => {
  test('returns true for standard .gif URLs', () => {
    assert.equal(isGifUrl('https://example.com/funny-cat.gif'), true);
    assert.equal(isGifUrl('http://mysite.org/image.GIF'), true);
  });

  test('returns true for .gif URLs with query parameters or hashes', () => {
    assert.equal(isGifUrl('https://example.com/dance.gif?width=200&height=200'), true);
    assert.equal(isGifUrl('https://example.com/smile.gif#autoplay'), true);
  });

  test('returns true for base64 encoded GIF data URLs', () => {
    assert.equal(isGifUrl('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), true);
    assert.equal(isGifUrl(' data:IMAGE/GIF;base64,xyz '), true);
  });

  test('returns true for Giphy host urls', () => {
    assert.equal(isGifUrl('https://giphy.com/gifs/funny-cat-3o7aD2saalBwwAgzY4'), true);
    assert.equal(isGifUrl('https://media.giphy.com/media/P7JmDW75B5fO1OoJB6/giphy.gif'), true);
  });

  test('returns false for regular non-gif images', () => {
    assert.equal(isGifUrl('https://example.com/logo.png'), false);
    assert.equal(isGifUrl('https://example.com/photo.jpeg?format=jpg'), false);
    assert.equal(isGifUrl('data:image/png;base64,xyz'), false);
  });

  test('returns false for non-image URLs and documents', () => {
    assert.equal(isGifUrl('https://example.com/document.pdf'), false);
    assert.equal(isGifUrl('https://example.com/index.html'), false);
    assert.equal(isGifUrl(''), false);
    assert.equal(isGifUrl(null), false);
  });
});
