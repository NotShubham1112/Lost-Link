import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  setDisplayName: (name: string) => ipcRenderer.invoke('set-display-name', name),
  connectPeer: (ip: string, port?: number) => ipcRenderer.invoke('connect-peer', { ip, port }),
  setLobbyState: (state: any) => ipcRenderer.invoke('set-lobby-state', state),
  sendPeerMessage: (toIp: string, text: string) => ipcRenderer.send('send-peer-message', { toIp, text }),
  resetSession: () => ipcRenderer.invoke('reset-session'),

  onUdpPeer: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on('udp-peer', subscription)
    return () => { ipcRenderer.removeListener('udp-peer', subscription) }
  },
  onPeerConnected: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on('udp-peer-connected', subscription)
    return () => { ipcRenderer.removeListener('udp-peer-connected', subscription) }
  },
  onPeerMessage: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on('peer-message', subscription)
    return () => { ipcRenderer.removeListener('peer-message', subscription) }
  },
  onPeerDisconnected: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on('peer-disconnected', subscription)
    return () => { ipcRenderer.removeListener('peer-disconnected', subscription) }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
