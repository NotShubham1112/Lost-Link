const { ipcRenderer } = require('electron');

// Phase 3: UI wiring for left panel (Nearby Users) and chat scaffold
const uiPeers = new Map(); // ip -> { displayName, aes, ip }

function renderUiPeers() {
  const container = document.getElementById('peers-list');
  if (!container) return;
  container.innerHTML = '';
  for (const [ip, p] of uiPeers) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 4px';

    const left = document.createElement('div');
    left.style.display = 'flex'; left.style.alignItems = 'center';
    const avatar = document.createElement('div');
    avatar.style.width = '28px'; avatar.style.height = '28px'; avatar.style.borderRadius = '50%'; avatar.style.background = '#555'; avatar.style.display = 'inline-flex'; avatar.style.alignItems = 'center'; avatar.style.justifyContent = 'center'; avatar.style.color = '#fff';
    avatar.textContent = (p.displayName || ip).substring(0,2).toUpperCase();
    const name = document.createElement('span'); name.style.marginLeft = '8px'; name.textContent = p.displayName || ip;
    const presence = document.createElement('span'); presence.style.marginLeft='8px'; presence.style.width='10px'; presence.style.height='10px'; presence.style.borderRadius='50%'; presence.style.display='inline-block'; presence.style.background = p.aes ? '#2ecc71' : '#555';
    left.appendChild(avatar); left.appendChild(name); left.appendChild(presence);

    const right = document.createElement('div');
    const chatBtn = document.createElement('button'); chatBtn.textContent = 'Chat'; chatBtn.style.marginLeft = '6px';
    chatBtn.onclick = () => {
      window.currentChatPeer = ip;
      const encBadge = document.getElementById('enc-badge');
      if (encBadge) encBadge.textContent = p.aes ? '🔒 Encrypted' : '🔓 Plaintext';
      const chatArea = document.getElementById('chat-area');
      if (chatArea) chatArea.innerHTML = `Selected peer: ${ip}`;
    };
    right.appendChild(chatBtn);

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // onboarding (first run)
  const onboard = document.getElementById('onboard');
  const displayNameInput = document.getElementById('display-name');
  const continueBtn = document.getElementById('continue');
  const seen = localStorage.getItem('lostlink.Onboarded');
  if (!seen) onboard.style.display = 'flex';
  continueBtn && continueBtn.addEventListener('click', async () => {
    const name = displayNameInput.value || 'Guest';
    localStorage.setItem('lostlink.DisplayName', name);
    localStorage.setItem('lostlink.Onboarded', 'true');
    onboard.style.display = 'none';
  });

  // UDP peer discovery events
  ipcRenderer.on('udp-peer', (event, data) => {
    const ip = data._ip || data._from || 'LAN';
    const existing = uiPeers.get(ip) || { ip, displayName: data.username || data.app || ip, aes: false };
    existing.displayName = data.username || data.app || ip;
    if (typeof data.aes !== 'undefined') existing.aes = data.aes;
    uiPeers.set(ip, existing);
    renderUiPeers();
  });
  ipcRenderer.on('udp-peer-connected', (event, data) => {
    if (data && data.ip) {
      const ip = data.ip; const p = uiPeers.get(ip) || {}; p.aes = data.aes === true; p.displayName = data.displayName || p.displayName || ip; uiPeers.set(ip, p); renderUiPeers();
    }
  });
  // Incoming private messages
  ipcRenderer.on('peer-message', (event, { from, text, ip }) => {
    // For MVP, just append to the right chat area if current chat peer matches
    const target = ip || window.currentChatPeer;
    if (!target) return;
    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
      const div = document.createElement('div');
      div.textContent = `${from}: ${text}`;
      chatArea.appendChild(div);
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  });
  // Send message to current peer (Phase 3 just scaffolds this)
  const sendBtn = document.getElementById('send-btn');
  const input = document.getElementById('message-input');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const toIp = window.currentChatPeer;
      const text = input.value.trim();
      if (!toIp || !text) return;
      ipcRenderer.send('send-peer-message', { toIp, text });
      const chatArea = document.getElementById('chat-area');
      const div = document.createElement('div'); div.textContent = `Me: ${text}`; chatArea.appendChild(div); chatArea.scrollTop = chatArea.scrollHeight; input.value = '';
    });
  }

  // Load local IP into title
  (async () => {
    try {
      const ip = await ipcRenderer.invoke('get-local-ip');
      if (ip) document.title = `Lost-Link (${ip})`;
    } catch (e) { /* ignore */ }
  })();
});
