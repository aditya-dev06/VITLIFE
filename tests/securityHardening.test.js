import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';

// Re-implement / export test for safePath & validateOutboundUrl behaviors
const safePath = (baseDir, userInput) => {
  if (typeof userInput !== 'string' || !userInput.trim()) {
    throw new Error('Invalid path input');
  }
  const sanitized = path.basename(userInput.replace(/\\/g, '/'));
  const resolved = path.resolve(baseDir, sanitized);
  const resolvedBase = path.resolve(baseDir);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new Error('Path traversal attempt blocked');
  }
  return resolved;
};

const ALLOWED_OUTBOUND_HOSTS = [
  'res.cloudinary.com',
  'generativelanguage.googleapis.com',
  'passvitian.in'
];

const validateOutboundUrl = (urlStr) => {
  if (typeof urlStr !== 'string') {
    throw new Error('Invalid URL format');
  }
  const parsed = new URL(urlStr);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('Invalid protocol: only HTTP and HTTPS allowed');
  }
  const blockedPatterns = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|localhost)/i;
  if (blockedPatterns.test(parsed.hostname)) {
    throw new Error('SSRF: Outbound request to private/internal network blocked');
  }
  if (!ALLOWED_OUTBOUND_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
    throw new Error(`SSRF: Host '${parsed.hostname}' is not in the outbound allowlist`);
  }
  return true;
};

test('safePath blocks directory traversal attempts', () => {
  const base = 'C:\\app\\uploads';
  
  // Normal filename
  const safe = safePath(base, 'avatar.png');
  assert.equal(path.basename(safe), 'avatar.png');

  // Directory traversal attacks
  assert.equal(path.basename(safePath(base, '../../etc/passwd')), 'passwd');
  assert.equal(path.basename(safePath(base, '..\\..\\windows\\system32\\cmd.exe')), 'cmd.exe');
  assert.equal(safePath(base, 'folder/sub/file.pdf').startsWith(path.resolve(base)), true);
});

test('validateOutboundUrl blocks SSRF and private IP ranges', () => {
  // Allowed hosts
  assert.equal(validateOutboundUrl('https://res.cloudinary.com/demo/image.png'), true);
  assert.equal(validateOutboundUrl('https://generativelanguage.googleapis.com/v1beta/models'), true);
  assert.equal(validateOutboundUrl('https://passvitian.in/api/list-papers'), true);

  // Blocked private/internal IPs
  assert.throws(() => validateOutboundUrl('http://127.0.0.1:8080/admin'), /SSRF/);
  assert.throws(() => validateOutboundUrl('http://localhost:3000/api'), /SSRF/);
  assert.throws(() => validateOutboundUrl('http://169.254.169.254/latest/meta-data/'), /SSRF/);
  assert.throws(() => validateOutboundUrl('http://10.0.0.1/internal'), /SSRF/);
  assert.throws(() => validateOutboundUrl('http://192.168.1.1/router'), /SSRF/);

  // Blocked untrusted external hosts
  assert.throws(() => validateOutboundUrl('https://evil-attacker.com/exploit'), /not in the outbound allowlist/);

  // Blocked dangerous protocols
  assert.throws(() => validateOutboundUrl('file:///etc/passwd'), /Invalid protocol/);
  assert.throws(() => validateOutboundUrl('ftp://ftp.example.com/file'), /Invalid protocol/);
});
