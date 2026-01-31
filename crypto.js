// Lightweight crypto utilities using Web Crypto API
async function generateIdentityKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  );
  const pub = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(pub)));
  return { publicKeyB64, privateKey: keyPair.privateKey };
}

async function generateECDHKeyPair() {
  const ec = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
  );
  const raw = await crypto.subtle.exportKey('raw', ec.publicKey);
  const publicKeyB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(raw)));
  return { publicKeyB64, privateKey: ec.privateKey };
}

async function deriveSharedSecret(privateKey, peerPublicKeyB64) {
  const peerRaw = new Uint8Array(atob(peerPublicKeyB64).split('').map(c => c.charCodeAt(0)));
  const peerPub = await crypto.subtle.importKey('raw', peerRaw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  const shared = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPub }, privateKey,
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
  return shared;
}

async function encryptAESGCM(plaintext, key) {
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv: btoa(String.fromCharCode.apply(null, iv)), ciphertext: btoa(String.fromCharCode.apply(null, new Uint8Array(ct))) };
}

async function decryptAESGCM(ciphertextB64, ivB64, key) {
  const ctArr = new Uint8Array(atob(ciphertextB64).split('').map(c => c.charCodeAt(0)));
  const ivArr = new Uint8Array(atob(ivB64).split('').map(c => c.charCodeAt(0)));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivArr }, key, ctArr);
  return new TextDecoder().decode(pt);
}

// Expose as a global helper for quick prototyping
window.LLCrypto = {
  generateIdentityKeys,
  generateECDHKeyPair,
  deriveSharedSecret,
  encryptAESGCM,
  decryptAESGCM
};
