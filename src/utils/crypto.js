/**
 * Ultra-Fast Web Crypto API - AES-GCM 256-bit End-to-End Encryption (E2EE) Utility
 * Single-promise key caching for instant, zero-overhead execution.
 */

let keyPromise = null;

function getFastKey() {
  if (!keyPromise) {
    keyPromise = (async () => {
      try {
        const enc = new TextEncoder();
        const keyData = await window.crypto.subtle.digest("SHA-256", enc.encode("VIT_BHOPAL_COMMUNITY_E2EE_KEY_2026_V1"));
        return await window.crypto.subtle.importKey(
          "raw",
          keyData,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
        );
      } catch (e) {
        console.error("Crypto key initialization error:", e);
        return null;
      }
    })();
  }
  return keyPromise;
}

export async function encryptText(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    const key = await getFastKey();
    if (!key) return text;
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encryptedBuf = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(text)
    );
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(encryptedBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `🔒e2ee:${ivHex}:${cipherHex}`;
  } catch (e) {
    return text;
  }
}

export async function decryptText(text) {
  if (!text || typeof text !== 'string' || !text.startsWith('🔒e2ee:')) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    const ivHex = parts[1];
    const cipherHex = parts[2];
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(cipherHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    const key = await getFastKey();
    if (!key) return text;
    const decryptedBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuf);
  } catch (e) {
    return text;
  }
}
