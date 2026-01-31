import { ElectronAPI } from '@electron-toolkit/preload'

interface P2PPeer {
  ip: string
  username: string
  status: string
  chatPort: number
  peerId: string
  _ip?: string
}

interface PeerMessage {
  from: string
  text: string
  ip: string
}

interface PeerConnected {
  ip: string
  displayName: string
  aes: boolean
}

interface CustomAPI {
  getLocalIP: () => Promise<string>
  connectPeer: (ip: string) => Promise<{ ok: boolean; ip: string; alreadyConnected?: boolean }>
  sendPeerMessage: (toIp: string, text: string) => void
  onUdpPeer: (callback: (peer: P2PPeer) => void) => void
  onPeerConnected: (callback: (data: PeerConnected) => void) => void
  onPeerMessage: (callback: (msg: PeerMessage) => void) => void
  onPeerDisconnected: (callback: (data: { ip: string }) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
