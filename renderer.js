const { ipcRenderer } = require('electron');

// Simple in-browser crypto helpers (wrapper around Web Crypto)
const cryptoUtil = {
  async generateIdentity() {
    const rsa = await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' },
      true, ['encrypt', 'decrypt']
    );
    const raw = await crypto.subtle.exportKey('spki', rsa.publicKey);
    const pubB64 = base64FromArrayBuffer(raw);
    // privateKey kept in memory for demo; in real app, store securely
    return { publicKeyB64: pubB64, privateKey: rsa.privateKey };
  },
  async generateECDH() {
    const ec = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
    );
    const raw = await crypto.subtle.exportKey('raw', ec.publicKey);
    return { publicKey: base64FromArrayBuffer(raw), privateKey: ec.privateKey };
  },
  // helpers for encryption using AES-GCM
  async encryptAESGCM(plaintext, key) {
    const enc = new TextEncoder();
    const data = enc.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return { iv: base64FromArrayBuffer(iv), ciphertext: base64FromArrayBuffer(ct) };
  },
  async decryptAESGCM(ciphertextB64, ivB64, key) {
    const ct = base64ToArrayBuffer(ciphertextB64);
    const iv = base64ToArrayBuffer(ivB64);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const dec = new TextDecoder();
    return dec.decode(pt);
  }
};

function base64FromArrayBuffer(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

document.addEventListener('DOMContentLoaded', async () => {
  // onboarding modal handling
  const onboard = document.getElementById('onboard');
  const displayNameInput = document.getElementById('display-name');
  const continueBtn = document.getElementById('continue');
  // show onboarding on first run
  const seen = localStorage.getItem('lostlink.Onboarded');
  if (!seen) {
    onboard.style.display = 'flex';
  }
  continueBtn && continueBtn.addEventListener('click', async () => {
    const name = displayNameInput.value || 'Guest';
    localStorage.setItem('lostlink.DisplayName', name);
    // generate keys (demo – store pub key as fingerprint)
    const id = await cryptoUtil.generateIdentity();
    const ec = await cryptoUtil.generateECDH();
    localStorage.setItem('lostlink.Identity', JSON.stringify({ publicKey: id.publicKeyB64 }));
    localStorage.setItem('lostlink.ECDH', JSON.stringify({ publicKey: ec.publicKey }));
    onboard.style.display = 'none';
  });

  // Nearby peers UI: show a connect button for each discovered peer
  const peersUl = document.getElementById('peers');
  const addPeer = (p) => {
    const li = document.createElement('li');
    const name = p.username || p.app || 'Peer';
    const ip = p._ip || p._from || 'LAN';
    li.textContent = `${name} @ ${ip}`;
    const btn = document.createElement('button');
    btn.textContent = 'Connect';
    btn.style.marginLeft = '8px';
    btn.onclick = () => {
      window.ipcConnect && window.ipcConnect(ip);
    };
    li.appendChild(btn);
    peersUl.appendChild(li);
  };
  ipcRenderer.on('udp-peer', (event, data) => {
    addPeer(data);
  });
  // show local IP in title bar (optional)
  try {
    const ip = await ipcRenderer.invoke('get-local-ip');
    if (ip) document.title = `Lost-Link (${ip})`;
  } catch (e) {
    // ignore
  }
});

// Expose a small bridge to connect to a peer from the UI
window.ipcConnect = (ip) => {
  ipcRenderer.invoke('connect-peer', { ip }).then((r) => {
    // nothing to do here yet; UI updates via events from main process
  }).catch(() => {});
};

// Additional UI glue: active chat state and sending messages
let activePeerIp = null;
const chatArea = document.getElementById('chat-area');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    const toIp = activePeerIp;
    const text = messageInput.value;
    if (!toIp || !text) return;
    ipcRenderer.send('send-peer-message', { toIp, text });
    const div = document.createElement('div');
    div.textContent = `Me: ${text}`;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
    messageInput.value = '';
  });
}

ipcRenderer.on('udp-peer-connected', (event, data) => {
  if (data && data.ip) {
    activePeerIp = data.ip;
  }
});
ipcRenderer.on('peer-message', (event, { from, text }) => {
  const div = document.createElement('div');
  div.textContent = `${from}: ${text}`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
});
