const { app, BrowserWindow, ipcMain } = require('electron');
const net = require('net');
const crypto = require('crypto');
const path = require('path');
const dgram = require('dgram');
const os = require('os');

const BROADCAST_PORT = 41234;
const BROADCAST_INTERVAL = 3000; // 3 seconds
let mainWindow;
let udpSocket;
// Identity keys (RSA for identity; managed in Node main process)
let rsaPublicPem = null;
let rsaPrivatePem = null;
let selfDisplayName = 'Host';
let selfPeerId = crypto.randomBytes(8).toString('hex');

// Simple in-process storage for connected peers
const peersByIp = new Map(); // ip -> { socket, displayName, rsaPubPem, aesKey }

// End-to-end encryption (ECDH) state
let ecdh; // Node crypto.ECDH instance
let ownEcdhPubB64 = null;
let chatServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWindow.on('closed', () => (mainWindow = null));
  // Initialize RSA identity keys in root process
  initIdentity()
    .then(() => {
      startUdpDiscovery();
      startChatServer();
    })
    .catch(() => {
      startUdpDiscovery();
      startChatServer();
    });
}

async function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function startUdpDiscovery() {
  udpSocket = dgram.createSocket('udp4');
  udpSocket.bind(BROADCAST_PORT, () => {
    try {
      udpSocket.setBroadcast(true);
    } catch (e) {
      // ignore
    }
  });

  udpSocket.on('message', (msg, rinfo) => {
    try {
      const payload = JSON.parse(msg.toString());
      payload._from = rinfo.address;
      payload._port = rinfo.port;
      // Attach sender IP for connection attempts
      payload._ip = rinfo.address;
      mainWindow && mainWindow.webContents.send('udp-peer', payload);
    } catch (e) {
      // ignore non-JSON messages
    }
  });

  // Broadcast presence periodically
  setInterval(() => {
    const payload = {
      app: 'Lost-Link',
      username: 'Guest',
      status: 'online',
      chatPort: 6000
    };
    const message = Buffer.from(JSON.stringify(payload));
    udpSocket.send(message, 0, message.length, BROADCAST_PORT, '255.255.255.255', (err) => {
      if (err) {
        // console.error(err);
      }
    });
  }, BROADCAST_INTERVAL);
}

ipcMain.handle('get-local-ip', async () => {
  return getLocalIP();
});

// Identity management (RSA 2048) in main process for security-sensitive private key
async function initIdentity() {
  if (rsaPublicPem && rsaPrivatePem) return;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  rsaPublicPem = publicKey;
  rsaPrivatePem = privateKey;
  // Initialize ECDH keys for per-peer encryption
  ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  ownEcdhPubB64 = ecdh.getPublicKey().toString('base64');
  return;
}

function pemFromBase64(base64Pub) {
  const pem = Buffer.from(base64Pub, 'base64').toString('utf8');
  return pem;
}

function listenToPeerLine(socket, onLine) {
  let buffer = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line) onLine(line);
    }
  });
}

function startChatServer() {
  chatServer = net.createServer((socket) => {
    const remoteIp = socket.remoteAddress.replace(/^::ffff:/, '');
    socket.setKeepAlive(true);
    socket.on('close', () => {
      console.log(`Peer disconnected: ${remoteIp}`);
      peersByIp.delete(remoteIp);
    });
    let peerHello = null;
    listenToPeerLine(socket, (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'handshake') {
          // store peer identity and prepare to receive messages
          peerHello = {
            ip: remoteIp,
            displayName: msg.displayName || 'Peer',
            rsaPublicB64: msg.rsaPublicKeyB64
          };
  // respond with our identity (including ECDH public key)
  const resp = {
    type: 'handshake',
    displayName: selfDisplayName,
    rsaPublicKeyB64: Buffer.from(rsaPublicPem, 'utf8').toString('base64'),
    ecdhPublicKeyB64: ownEcdhPubB64,
    peerId: selfPeerId
  };
          socket.write(JSON.stringify(resp) + '\n');
          peersByIp.set(remoteIp, { socket, ...peerHello });
          // If peer provided their ECDH pub, derive shared AES key now
          if (msg.ecdhPublicKeyB64 && ecdh) {
            try {
              const shared = ecdh.computeSecret(Buffer.from(msg.ecdhPublicKeyB64, 'base64'));
              const aesKey = crypto.hkdfSync('sha256', shared, Buffer.from('lost-link'), Buffer.alloc(0), 32);
              const entry = peersByIp.get(remoteIp) || {};
              entry.aesKey = aesKey;
              peersByIp.set(remoteIp, { socket, ...peerHello, aesKey });
            } catch (e) {
              // ignore if key derivation fails
            }
          }
          const aes = !!peersByIp.get(remoteIp)?.aesKey;
          mainWindow && mainWindow.webContents.send('udp-peer-connected', { ip: remoteIp, displayName: peerHello.displayName, aes });
        } else if (msg.type === 'handshake') {
          // handshake response from peer (could carry their ECDH pub key too)
          // we already set peerHello earlier; enrich with remote ECDH pub if present
          if (msg.ecdhPublicKeyB64 && peerHello) {
            // derive shared secret if possible
            if (ecdh && ownEcdhPubB64) {
              try {
                const shared = ecdh.computeSecret(Buffer.from(msg.ecdhPublicKeyB64, 'base64'));
                const aesKey = crypto.hkdfSync('sha256', shared, Buffer.from('lost-link'), Buffer.alloc(0), 32);
                const entry = peersByIp.get(remoteIp) || {};
                entry.aesKey = aesKey;
                peersByIp.set(remoteIp, { socket, ...peerHello, aesKey });
              } catch (e) {
                // ignore
              }
            }
          }
        } else if (msg.type === 'msg') {
          // Received encrypted message (AES-GCM)
          const peer = peersByIp.get(remoteIp) || {};
          const aesKey = peer.aesKey;
          if (!aesKey) {
            // No AES key yet; check for RSA fallback
            if (peer.rsaPublicPem) {
              try {
                const ciphertext = Buffer.from(msg.ciphertextB64, 'base64');
                const plaintext = crypto.privateDecrypt({ key: rsaPrivatePem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, ciphertext);
                mainWindow && mainWindow.webContents.send('peer-message', { from: peerHello.displayName, text: plaintext.toString('utf8'), ip: remoteIp });
                const entry = peersByIp.get(remoteIp) || {};
                entry.history = entry.history || [];
                entry.history.push({ from: peerHello.displayName, text: plaintext.toString('utf8'), time: new Date().toISOString() });
                peersByIp.set(remoteIp, entry);
              } catch (e) {
                // decryption failed
              }
            }
            return;
          }
            try {
              const iv = Buffer.from(msg.ivB64, 'base64');
              const ct = Buffer.from(msg.ciphertextB64, 'base64');
              const tag = Buffer.from(msg.tagB64, 'base64');
              const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
              decipher.setAuthTag(tag);
              let plaintext = decipher.update(ct, null, 'utf8');
              plaintext += decipher.final('utf8');
              // Persist to per-peer history
              const entry = peersByIp.get(remoteIp) || { socket, displayName: peerHello.displayName };
              entry.history = entry.history || [];
              entry.history.push({ from: peerHello.displayName, text: plaintext, time: new Date().toISOString() });
              peersByIp.set(remoteIp, entry);
              mainWindow && mainWindow.webContents.send('peer-message', { from: peerHello.displayName, text: plaintext, ip: remoteIp });
          } catch (err) {
            // decryption failed
          }
        }
      } catch (e) {
        // invalid line, ignore
      }
    });
  });

  chatServer.listen(6000, () => {
    console.log('Chat server listening on port 6000');
  });
}

// IPC: connect to a peer via TCP for chat
ipcMain.handle('connect-peer', async (event, { ip }) => {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host: ip, port: 6000 }, () => {
      // send handshake introduction
      const handshake = {
        type: 'handshake',
        displayName: selfDisplayName,
        rsaPublicKeyB64: Buffer.from(rsaPublicPem, 'utf8').toString('base64'),
        ecdhPublicKeyB64: ownEcdhPubB64,
        peerId: selfPeerId
      };
      sock.write(JSON.stringify(handshake) + '\n');
      peersByIp.set(ip, { socket: sock, displayName: 'Unknown' });
      resolve({ ok: true, ip });
    });
    sock.on('data', (data) => {
      // handshake response
      try {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.type === 'handshake') {
            const peerPubPem = Buffer.from(msg.rsaPublicKeyB64, 'base64').toString('utf8');
            const peerIp = ip;
            const entry = peersByIp.get(peerIp) || {};
            entry.displayName = msg.displayName || 'Peer';
            entry.rsaPublicPem = peerPubPem;
            peersByIp.set(peerIp, entry);
            // Inform renderer
            mainWindow && mainWindow.webContents.send('udp-peer-connected', { ip: peerIp, displayName: entry.displayName });
          }
        }
      } catch (e) {
        // ignore
      }
    });
    sock.on('error', (err) => {
      reject(err);
    });
  });
});

// IPC: send a message to a connected peer
// - Use AES-GCM if an AES key exists for the peer
// - Fall back to RSA-OAEP if AES is not yet established
ipcMain.on('send-peer-message', (event, { toIp, text }) => {
  const peer = peersByIp.get(toIp);
  if (!peer) {
    console.warn('Peer not found for', toIp);
    return;
  }
  if (peer.aesKey) {
    const aesKey = peer.aesKey;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    let ciphertext = cipher.update(text, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag().toString('base64');
    const payload = {
      type: 'msg',
      ivB64: iv.toString('base64'),
      ciphertextB64: ciphertext,
      tagB64: tag
    };
    peer.socket.write(JSON.stringify(payload) + '\n');
  } else if (peer.rsaPublicPem) {
    // RSA fallback path using recipient's public key
    const buffer = Buffer.from(text, 'utf8');
    const encrypted = crypto.publicEncrypt({ key: peer.rsaPublicPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);
    const payload = { type: 'msg', ciphertextB64: encrypted.toString('base64') };
    peer.socket.write(JSON.stringify(payload) + '\n');
  } else {
    console.warn('No AES key or RSA key available for', toIp);
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
