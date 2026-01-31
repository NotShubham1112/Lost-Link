import { ElectronAPI } from '@electron-toolkit/preload'

interface P2PPeer {
  ip: string
  username: string
  status: string
  chatPort: number
  peerId: string
  _ip?: string
  lobbyName?: string | null
  isLobbyLocked?: boolean
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
  connectPeer: (ip: string, port?: number) => Promise<{ ok: boolean; ip: string; alreadyConnected?: boolean }>
  resetSession: () => Promise<{ ok: boolean }>
  setDisplayName: (name: string) => Promise<{ ok: boolean; name: string }>
  setLobbyState: (state: { isHosting: boolean, name?: string, isLocked?: boolean }) => Promise<{ ok: boolean }>
  sendPeerMessage: (toIp: string, text: string) => void
  onUdpPeer: (callback: (peer: P2PPeer) => void) => () => void
  onPeerConnected: (callback: (data: PeerConnected) => void) => () => void
  onPeerMessage: (callback: (msg: PeerMessage) => void) => () => void
  onPeerDisconnected: (callback: (data: { ip: string }) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
