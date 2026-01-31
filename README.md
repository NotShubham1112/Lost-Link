# Lost-Link

> A local-first, LAN-only chat application with zero internet reliance and end-to-end encryption.

## Overview

**Lost-Link** is a secure, offline messaging application designed for local area networks (LAN). Each device can host or join a chat, and all private conversations are encrypted end-to-end using modern cryptographic protocols. The application requires no internet connection and operates entirely within your local network.

### Core Features

- 🔒 **End-to-End Encryption**: AES-256-GCM per-peer encryption with ECDH key exchange
- 📡 **Zero Internet Dependency**: Fully offline, LAN-only operation
- 🔍 **Auto-Discovery**: UDP broadcast for automatic peer discovery
- 🔑 **RSA Identity**: 2048-bit RSA keys for peer identity
- 💬 **Real-Time Messaging**: TCP-based reliable message delivery
- 🎨 **Modern UI**: Built with Electron, React, and Tailwind CSS

---

## Architecture

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Electron (Node.js), TCP/UDP networking
- **Cryptography**: Node.js `crypto` module (RSA, ECDH, AES-GCM, HKDF)
- **Build System**: Electron-Vite

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Renderer Process                   │
│              (React UI + TypeScript)                 │
│                                                       │
│  - Display peers and messages                        │
│  - Send messages via IPC                             │
│  - Receive updates from main process                 │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ IPC Bridge (Preload Script)
                    │
┌───────────────────▼─────────────────────────────────┐
│                   Main Process                       │
│              (Electron Backend)                      │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │           UDP Discovery Service              │    │
│  │  - Broadcasts presence every 3s              │    │
│  │  - Listens for peer broadcasts               │    │
│  │  - Port: 41234                               │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │           TCP Chat Service                   │    │
│  │  - Handshake & key exchange                  │    │
│  │  - Encrypted message transmission            │    │
│  │  - Port: 6000                                │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │         Cryptography Engine                  │    │
│  │  - RSA-2048 identity keys                    │    │
│  │  - ECDH (P-256) per-peer keys                │    │
│  │  - AES-256-GCM encryption                    │    │
│  │  - HKDF-SHA256 key derivation                │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │           Peer State Manager                 │    │
│  │  - In-memory peer registry (peersByIp)       │    │
│  │  - Per-peer AES keys & sockets               │    │
│  │  - Chat history storage                      │    │
│  └─────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. UDP Discovery Service

**Purpose**: Automatic peer discovery on the local network.

- **Broadcast Interval**: Every 3 seconds
- **Port**: 41234
- **Payload**:
  ```json
  {
    "app": "Lost-Link",
    "username": "Guest",
    "status": "online",
    "chatPort": 6000
  }
  ```

**Flow**:
1. Each instance broadcasts its presence via UDP
2. Listener receives broadcasts from other peers
3. Discovered peers are forwarded to UI via IPC event `'udp-peer'`

### 2. TCP Handshake & Connection

**Purpose**: Establish encrypted peer-to-peer connections.

- **Port**: 6000
- **Protocol**: TCP

**Handshake Flow**:

```
Peer A                              Peer B
  |                                    |
  |-- TCP Connect to B:6000 --------->|
  |                                    |
  |-- Handshake Message -------------->|
  |   {                                |
  |     type: 'handshake',             |
  |     displayName: 'Alice',          |
  |     rsaPublicKeyB64: '...',        |
  |     ecdhPublicKeyB64: '...'        |
  |   }                                |
  |                                    |
  |<-- Handshake Response -------------|
  |   {                                |
  |     type: 'handshake',             |
  |     displayName: 'Bob',            |
  |     rsaPublicKeyB64: '...',        |
  |     ecdhPublicKeyB64: '...',       |
  |     peerId: '...'                  |
  |   }                                |
  |                                    |
  |-- Derive Shared AES Key -------->  |-- Derive Shared AES Key
  |   (ECDH + HKDF)                    |   (ECDH + HKDF)
  |                                    |
  |<====== Encrypted Channel ========>|
```

**Key Exchange**:
1. Both peers send their ECDH public keys (`ecdhPublicKeyB64`)
2. Each side computes the shared secret: `ecdh.computeSecret(peerPublicKey)`
3. Derive AES-256 key using HKDF-SHA256 with salt `'lost-link'`
4. Store `aesKey` in peer entry for future message encryption

### 3. Cryptography & Encryption

#### Identity Keys (RSA-2048)
- Generated on application startup
- Used for identity verification
- Provides RSA-OAEP encryption fallback

#### Session Keys (ECDH P-256 + AES-256-GCM)
- **Key Exchange**: Elliptic Curve Diffie-Hellman (P-256)
- **Key Derivation**: HKDF-SHA256 with salt `'lost-link'` → 32 bytes
- **Encryption**: AES-256-GCM with fresh 12-byte IV per message
- **Authentication**: GCM provides authenticated encryption with tag

#### Message Encryption (Outbound)

**Primary Path (AES-256-GCM)**:
```javascript
// If peer.aesKey exists
{
  type: 'msg',
  ivB64: '...', // 12-byte IV (base64)
  ciphertextB64: '...',
  tagB64: '...' // 16-byte auth tag
}
```

**Fallback Path (RSA-OAEP)**:
```javascript
// If AES not available but RSA public key exists
{
  type: 'msg',
  ciphertextB64: '...' // RSA-OAEP encrypted
}
```

#### Message Decryption (Inbound)

1. **Check if `peer.aesKey` exists**:
   - Yes → Decrypt with AES-256-GCM using `ivB64`, `ciphertextB64`, `tagB64`
   - No → Attempt RSA-OAEP decryption with private key

2. **Emit plaintext** to UI via `'peer-message'` IPC event

3. **Store in history** for the peer

4. **Error handling**: Log decryption errors, skip malformed messages

---

## Data Models

### Peer Entry (In-Memory)

Each peer is stored in `peersByIp` map, keyed by IP address:

```typescript
interface Peer {
  ip: string;                    // Peer's IP address
  displayName: string;            // Chosen display name
  rsaPublicPem?: string;          // RSA public key (PEM format)
  rsaPublicKeyB64?: string;       // RSA public key (base64)
  ecdhPublicKeyB64?: string;      // ECDH public key (base64)
  aesKey?: Buffer;                // Derived AES-256 key
  socket?: Socket;                // TCP connection
  history?: Message[];            // Chat history
  aes: boolean;                   // True if aesKey is established
  peerId?: string;                // Unique peer identifier
  status?: string;                // Connection status
}
```

### Local Identity (In-Memory)

Generated on startup, not persisted in MVP:

```typescript
interface LocalIdentity {
  rsaPublicPem: string;           // RSA public key (PEM)
  rsaPrivatePem: string;          // RSA private key (PEM)
  ownEcdhPubB64: string;          // ECDH public key (base64)
  ecdh: ECDH;                     // ECDH instance
}
```

---

## IPC Communication

### Exposed Methods (Renderer → Main)

| Method | Description | Parameters |
|--------|-------------|------------|
| `get-local-ip` | Get local IPv4 address | None |
| `connect-peer` | Connect to a peer | `ip: string` |
| `send-peer-message` | Send encrypted message | `ip: string, message: string` |

### Events (Main → Renderer)

| Event | Description | Payload |
|-------|-------------|---------|
| `udp-peer` | New peer discovered | `{ username, status, _ip, _from }` |
| `udp-peer-connected` | Handshake complete | `{ ip, displayName, aes: boolean }` |
| `peer-message` | Message received | `{ from, plaintext, ip }` |

---

## Security Model

### Current Implementation (MVP)

✅ **Confidentiality**:
- AES-256-GCM per-peer session keys
- ECDH (P-256) for ephemeral key exchange
- Fresh IV per message for semantic security

✅ **Authentication**:
- RSA-2048 identity keys
- GCM authentication tags

✅ **Threat Model**:
- Protects against passive eavesdropping on LAN
- Provides message integrity via GCM tags

### Limitations & Future Improvements

⚠️ **Known Limitations**:
- Keys generated in-memory, not persisted securely
- No forward secrecy (keys not rotated per session)
- No peer identity verification mechanism
- RSA fallback is inefficient for high-volume messages

🔮 **Planned Improvements**:
1. **Secure Storage**: Migrate to OS-backed keychain or `electron-store` with encryption
2. **Key Rotation**: Implement per-session re-keying and session lifetimes
3. **Identity Verification**: Add peer verification flow (e.g., QR codes, fingerprints)
4. **Forward Secrecy**: Rotate ECDH keys periodically
5. **Audit Logging**: Track key exchanges and connection events

---

## Testing

### End-to-End Test Flow

1. **Setup**:
   - Run two instances on the same LAN
   - Complete onboarding (set display names)

2. **Discovery**:
   - Verify UDP broadcasts are sent/received
   - Check peer appears in UI

3. **Handshake**:
   - Connect to peer
   - Verify `aes: true` in peer state (indicates AES key derivation)

4. **Messaging**:
   - Send message from Instance A → B
   - Verify AES-encrypted payload on wire
   - Verify plaintext received on Instance B
   - Check message appears in chat history

5. **Fallback Path**:
   - Simulate scenario where AES key isn't ready
   - Verify RSA-OAEP fallback engages
   - Confirm decryption succeeds

6. **Disconnection**:
   - Kill one instance
   - Verify peer is removed from `peersByIp`
   - Check cleanup logs

### Edge Cases

- ❌ Non-JSON UDP payloads → Ignored
- ❌ Malformed handshake → Logged, connection dropped
- ❌ Missing RSA key on recipient → Warning logged, RSA fallback fails
- ❌ Decryption error → Log error, skip message

---

## Development Roadmap

### ✅ Patch A (Completed)
- Handshake implementation
- ECDH key exchange
- AES key derivation
- Per-peer state management

### 🚧 Upcoming Patches

**Patch B**: Testing & Validation
- Unit tests for AES encryption/decryption
- RSA fallback path tests
- Synthetic message testing

**Patch C**: Chat History
- In-memory history viewer
- IPC methods for history access
- UI integration for chat logs

**Patch D**: Secure Persistence
- Migrate keys to secure storage (electron-store or OS keychain)
- Persistent chat history
- Encrypted local database

**Patch E**: UI Enhancements (Phase 3/4)
- Improved peer connection UI
- Real-time encryption status indicators
- Enhanced chat interface
- Settings and configuration panel

---

## Project Structure

```
lost-link/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # Entry point
│   │   ├── udp.ts          # UDP discovery service
│   │   ├── tcp.ts          # TCP chat service
│   │   └── crypto.ts       # Cryptography utilities
│   │
│   ├── preload/            # Preload scripts (IPC bridge)
│   │   └── index.ts        # Exposed IPC methods
│   │
│   └── renderer/           # React frontend
│       ├── src/
│       │   ├── components/ # UI components
│       │   ├── assets/     # Styles and images
│       │   └── App.tsx     # Root component
│       └── index.html
│
├── electron.vite.config.ts # Build configuration
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- LAN connection (for peer discovery)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd lost-link

# Install dependencies
npm install
```

### Development

```bash
# Start in development mode
npm run dev
```

### Build

```bash
# Build for production
npm run build

# Build installer for Windows
npm run build:win

# Build installer for macOS
npm run build:mac

# Build installer for Linux
npm run build:linux
```

---

## Usage

1. **Launch** the application
2. **Set your display name** during onboarding
3. **Wait for peer discovery** (automatic via UDP broadcast)
4. **Connect to a peer** by clicking on their entry
5. **Start chatting** - all messages are encrypted automatically

### Manual Connection

If auto-discovery fails:
1. Note your local IP from the app
2. Share IP with peer (e.g., via another channel)
3. Use "Connect by IP" feature to manually connect

---

## Troubleshooting

### Peers Not Discovered

- **Check firewall**: Ensure UDP port 41234 is allowed
- **Verify LAN**: Both devices must be on the same network
- **Manual connection**: Use IP address to connect directly

### Connection Refused

- **TCP port**: Ensure port 6000 is not blocked
- **Antivirus**: Temporarily disable to test

### Messages Not Decrypting

- **Check logs**: Look for decryption errors in console
- **Handshake status**: Verify `aes: true` in peer state
- **RSA fallback**: Ensure RSA keys were exchanged during handshake

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

---

## License

[Your chosen license here]

---

## Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Electron-Vite](https://electron-vite.org/)

Cryptography powered by Node.js `crypto` module.

---

## Contact

For questions or support, please open an issue on GitHub.
