import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  connectPeer: (ip: string) => ipcRenderer.invoke('connect-peer', { ip }),
  sendPeerMessage: (toIp: string, text: string) => ipcRenderer.send('send-peer-message', { toIp, text }),

  onUdpPeer: (callback) => ipcRenderer.on('udp-peer', (_event, value) => callback(value)),
  onPeerConnected: (callback) => ipcRenderer.on('udp-peer-connected', (_event, value) => callback(value)),
  onPeerMessage: (callback) => ipcRenderer.on('peer-message', (_event, value) => callback(value)),
  onPeerDisconnected: (callback) => ipcRenderer.on('peer-disconnected', (_event, value) => callback(value))
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
