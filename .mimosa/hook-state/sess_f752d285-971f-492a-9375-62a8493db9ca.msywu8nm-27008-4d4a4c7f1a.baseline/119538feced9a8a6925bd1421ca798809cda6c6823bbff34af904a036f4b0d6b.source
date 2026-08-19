/**
 * Cryptographic Utility - Transit TLS & Legacy Decryption Engine
 * 
 * ⚠️ SECURITY NOTE: The legacy E2EE implementation below uses a shared symmetric key
 * which provides NO real end-to-end encryption security. It is retained ONLY for
 * backward-compatible rendering of historical messages prefixed with '🔒e2ee:'.
 * 
 * Current messages are protected via Transport Layer Security (TLS/HTTPS) in transit
 * and server-side access controls at rest. The encryptText() function is a no-op passthrough.
 * 
 * DO NOT rely on this module for confidentiality guarantees.
 */

let keyPromise = null;

function getFastKey() {
  if (!keyPromise) {
    keyPromise = (async () => {
      try {
        const subtle = globalThis.crypto?.subtle || (typeof window !== 'undefined' ? window.crypto?.subtle : null);
        if (!subtle) return null;
        const enc = new TextEncoder();
        const keyData = await subtle.digest("SHA-256", enc.encode("VIT_BHOPAL_COMMUNITY_E2EE_KEY_2026_V1"));
        return await subtle.importKey(
          "raw",
          keyData,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
        );
      } catch (e) {
        console.error("Crypto key initialization error:", e);
        keyPromise = null;
        return null;
      }
    })();
  }
  return keyPromise;
}

export async function encryptText(text) {
  if (!text || typeof text !== 'string') return text;
  // Transparent pass-through: Chat traffic is protected via strict HTTPS/WSS transport encryption
  return text;
}

export async function decryptText(text) {
  if (!text || typeof text !== 'string' || !text.startsWith('🔒e2ee:')) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    const ivHex = parts[1] || '';
    const cipherHex = parts[2] || '';
    const ivMatches = ivHex.match(/.{1,2}/g) || [];
    const cipherMatches = cipherHex.match(/.{1,2}/g) || [];
    if (ivMatches.length === 0 || cipherMatches.length === 0) return text;

    const iv = new Uint8Array(ivMatches.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(cipherMatches.map(byte => parseInt(byte, 16)));
    
    const subtle = globalThis.crypto?.subtle || (typeof window !== 'undefined' ? window.crypto?.subtle : null);
    if (!subtle) return text;
    const key = await getFastKey();
    if (!key) return text;
    const decryptedBuf = await subtle.decrypt(
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
