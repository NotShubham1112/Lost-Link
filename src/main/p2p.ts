import { ipcMain, BrowserWindow } from 'electron'
import * as net from 'net'
import * as dgram from 'dgram'
import * as crypto from 'crypto'
import * as os from 'os'

const BROADCAST_PORT = 41234
const CHAT_PORT = 6000
const BROADCAST_INTERVAL = 3000

interface PeerInfo {
    ip: string
    displayName: string
    rsaPublicPem?: string
    ecdhPublicKeyB64?: string
    aesKey?: Buffer
    socket?: net.Socket
}

export class P2PService {
    private udpSocket: dgram.Socket | null = null
    private chatServer: net.Server | null = null
    private peersByIp: Map<string, PeerInfo> = new Map()
    private rsaPublicPem: string = ''
    private rsaPrivatePem: string = ''
    private ecdh: crypto.ECDH | null = null
    private ownEcdhPubB64: string = ''
    private selfPeerId: string = crypto.randomBytes(8).toString('hex')
    private selfDisplayName: string = 'User-' + this.selfPeerId.slice(0, 4)
    private mainWindow: BrowserWindow | null = null
    private lobbyState = {
        isHosting: false,
        name: '',
        isLocked: false
    }

    constructor() {
        this.initIdentity()
    }

    public setMainWindow(window: BrowserWindow): void {
        this.mainWindow = window
    }

    private initIdentity(): void {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        })
        this.rsaPublicPem = publicKey
        this.rsaPrivatePem = privateKey

        this.ecdh = crypto.createECDH('prime256v1')
        this.ecdh.generateKeys()
        this.ownEcdhPubB64 = this.ecdh.getPublicKey().toString('base64')
    }

    public async getLocalIP(): Promise<string> {
        const nets = os.networkInterfaces()
        for (const name of Object.keys(nets)) {
            const interfaces = nets[name]
            if (interfaces) {
                for (const netInterface of interfaces) {
                    if (netInterface.family === 'IPv4' && !netInterface.internal) {
                        return netInterface.address
                    }
                }
            }
        }
        return '127.0.0.1'
    }

    public start(): void {
        this.startUdpDiscovery()
        this.startChatServer()
        this.setupIpcHandlers()
    }

    private getBroadcastAddresses(): string[] {
        const list: string[] = []
        try {
            const nets = os.networkInterfaces()
            for (const name of Object.keys(nets)) {
                const interfaces = nets[name]
                if (interfaces) {
                    for (const netInterface of interfaces) {
                        if (netInterface.family === 'IPv4' && !netInterface.internal) {
                            // Calculate broadcast address
                            // IP OR (NOT Netmask)
                            const addr = netInterface.address.split('.').map(Number)
                            const mask = netInterface.netmask.split('.').map(Number)
                            const broadcast = addr.map((b, i) => b | (255 - mask[i])).join('.')
                            list.push(broadcast)
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Failed to calculate broadcast addresses:', e)
        }
        // Always include global broadcast as fallback
        if (!list.includes('255.255.255.255')) list.push('255.255.255.255')
        return list
    }

    private startUdpDiscovery(): void {
        try {
            this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

            this.udpSocket.on('message', (msg, rinfo) => {
                try {
                    const payload = JSON.parse(msg.toString())
                    // Don't show ourselves in discovery if we are scanning locally, 
                    // unless we want to debug. Usually helpful to see "self" if filtering properly,
                    // but usually we filter by ID.
                    // Let's filter by peerId if matches self
                    if (payload.app === 'Lost-Link' && payload.peerId !== this.selfPeerId) {
                        payload._ip = rinfo.address
                        this.mainWindow?.webContents.send('udp-peer', payload)
                    }
                } catch (e) {
                    // Ignore non-JSON or other app messages
                }
            })

            this.udpSocket.on('error', (err) => {
                console.error('[P2P] UDP Socket error:', err)
            })

            this.udpSocket.bind(BROADCAST_PORT, () => {
                this.udpSocket?.setBroadcast(true)
                console.log(`[P2P] UDP Discovery listening on port ${BROADCAST_PORT}`)
            })
        } catch (e) {
            console.error('[P2P] Failed to create UDP socket:', e)
        }

        setInterval(async () => {
            // Get actual bound port, or fallback to default
            const address = this.chatServer?.address()
            // @ts-ignore
            const currentPort = address ? address.port : CHAT_PORT

            const payload = {
                app: 'Lost-Link',
                username: this.selfDisplayName,
                status: 'online',
                chatPort: currentPort,
                peerId: this.selfPeerId,
                lobbyName: this.lobbyState.isHosting ? this.lobbyState.name : null,
                isLobbyLocked: this.lobbyState.isLocked
            }
            const message = Buffer.from(JSON.stringify(payload))

            const broadcasts = this.getBroadcastAddresses()
            for (const addr of broadcasts) {
                try {
                    this.udpSocket?.send(message, 0, message.length, BROADCAST_PORT, addr)
                } catch (e) {
                    // Ignore send errors for specific addresses
                }
            }
        }, BROADCAST_INTERVAL)
    }

    private startChatServer(): void {
        const tryListen = (port: number) => {
            this.chatServer = net.createServer((socket) => {
                const remoteIp = socket.remoteAddress?.replace(/^::ffff:/, '') || ''
                socket.setKeepAlive(true)

                if (this.lobbyState.isHosting && this.lobbyState.isLocked) {
                    // Reject connection if lobby is locked
                    console.log(`[P2P] Rejected connection from ${remoteIp} (Lobby Locked)`)
                    socket.destroy()
                    return
                }

                this.setupSocketListeners(socket, remoteIp)
            })

            this.chatServer.on('error', (e: any) => {
                if (e.code === 'EADDRINUSE') {
                    console.log(`Port ${port} in use, trying ${port + 1}...`)
                    tryListen(port + 1)
                } else {
                    console.error('[P2P] Server error:', e)
                }
            })

            this.chatServer.listen(port, () => {
                console.log(`Chat server listening on port ${port}`)
            })
        }

        tryListen(CHAT_PORT)
    }

    private setupSocketListeners(socket: net.Socket, remoteIp: string): void {
        let buffer = ''
        socket.setEncoding('utf8')

        socket.on('data', (chunk) => {
            buffer += chunk
            let idx
            while ((idx = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, idx).trim()
                buffer = buffer.slice(idx + 1)
                if (line) this.handlePeerMessage(socket, remoteIp, line)
            }
        })

        socket.on('close', () => {
            console.log(`Peer disconnected: ${remoteIp}`)
            this.peersByIp.delete(remoteIp)
            this.mainWindow?.webContents.send('peer-disconnected', { ip: remoteIp })
        })

        socket.on('error', (err) => {
            console.error(`Socket error from ${remoteIp}:`, err)
        })
    }

    private handlePeerMessage(socket: net.Socket, remoteIp: string, line: string): void {
        try {
            const msg = JSON.parse(line)
            if (msg.type === 'handshake') {
                const peerInfo: PeerInfo = {
                    ip: remoteIp,
                    displayName: msg.displayName || 'Peer',
                    rsaPublicPem: Buffer.from(msg.rsaPublicKeyB64, 'base64').toString('utf8'),
                    ecdhPublicKeyB64: msg.ecdhPublicKeyB64,
                    socket
                }

                // Derive AES key if they sent ECDH pub key
                if (msg.ecdhPublicKeyB64 && this.ecdh) {
                    try {
                        const shared = this.ecdh.computeSecret(Buffer.from(msg.ecdhPublicKeyB64, 'base64'))
                        const derived = crypto.hkdfSync('sha256', shared, Buffer.from('lost-link'), Buffer.alloc(0), 32)
                        peerInfo.aesKey = Buffer.from(derived)
                        console.log(`[P2P] Established AES-256-GCM session with ${remoteIp}`)
                    } catch (err) {
                        console.error('Key derivation failed:', err)
                    }
                }

                this.peersByIp.set(remoteIp, peerInfo)

                // Bi-directional handshake protocol
                // If we received an initial handshake, we must respond with our keys to complete the ECDH exchange
                if (!msg.isResponse) {
                    console.log(`[P2P] Responding to handshake from ${remoteIp}`)
                    const resp = {
                        type: 'handshake',
                        isResponse: true,
                        displayName: this.selfDisplayName,
                        rsaPublicKeyB64: Buffer.from(this.rsaPublicPem, 'utf8').toString('base64'),
                        ecdhPublicKeyB64: this.ownEcdhPubB64,
                        peerId: this.selfPeerId
                    }
                    socket.write(JSON.stringify(resp) + '\n')
                } else {
                    console.log(`[P2P] Handshake completed with ${remoteIp}`)
                }

                // Notify frontend of successful secure connection
                this.mainWindow?.webContents.send('udp-peer-connected', {
                    ip: remoteIp,
                    displayName: peerInfo.displayName,
                    aes: !!peerInfo.aesKey // This is critical for the UI "Secure" badge
                })
            } else if (msg.type === 'msg') {
                this.decryptAndForwardMessage(remoteIp, msg)
            }
        } catch (e) {
            console.error('Failed to handle peer message:', e)
        }
    }

    private decryptAndForwardMessage(remoteIp: string, msg: any): void {
        const peer = this.peersByIp.get(remoteIp)
        if (!peer) return

        try {
            let plaintext = ''
            if (peer.aesKey && msg.ivB64 && msg.tagB64) {
                const iv = Buffer.from(msg.ivB64, 'base64')
                const ct = Buffer.from(msg.ciphertextB64, 'base64')
                const tag = Buffer.from(msg.tagB64, 'base64')
                const decipher = crypto.createDecipheriv('aes-256-gcm', peer.aesKey, iv)
                decipher.setAuthTag(tag)
                plaintext = decipher.update(ct, undefined, 'utf8')
                plaintext += decipher.final('utf8')
            } else if (msg.ciphertextB64) {
                // Fallback to RSA
                const ciphertext = Buffer.from(msg.ciphertextB64, 'base64')
                plaintext = crypto.privateDecrypt(
                    { key: this.rsaPrivatePem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
                    ciphertext
                ).toString('utf8')
            }

            if (plaintext) {
                this.mainWindow?.webContents.send('peer-message', {
                    from: peer.displayName,
                    text: plaintext,
                    ip: remoteIp
                })
            }
        } catch (e) {
            console.error('Decryption failed:', e)
        }
    }

    private resetSession(): void {
        console.log('Resetting P2P session...')
        // Close all active sockets
        for (const [ip, peer] of this.peersByIp) {
            if (peer.socket) {
                peer.socket.end()
                peer.socket.destroy()
            }
        }
        this.peersByIp.clear()

        // Rotate identity
        this.selfPeerId = crypto.randomBytes(8).toString('hex')
        this.selfDisplayName = 'User-' + this.selfPeerId.slice(0, 4)
        this.initIdentity()
    }

    private setupIpcHandlers(): void {
        ipcMain.handle('get-local-ip', () => this.getLocalIP())
        ipcMain.handle('set-display-name', (_event, name: string) => {
            this.selfDisplayName = name || 'User-' + this.selfPeerId.slice(0, 4)
            return { ok: true, name: this.selfDisplayName }
        })

        ipcMain.handle('reset-session', () => {
            this.resetSession()
            return { ok: true }
        })

        ipcMain.handle('connect-peer', async (_event, { ip, port }) => {
            return new Promise((resolve, reject) => {
                if (this.peersByIp.has(ip)) {
                    return resolve({ ok: true, ip, alreadyConnected: true })
                }

                const targetPort = port || CHAT_PORT

                const socket = net.connect({ host: ip, port: targetPort }, () => {
                    const handshake = {
                        type: 'handshake',
                        displayName: this.selfDisplayName,
                        rsaPublicKeyB64: Buffer.from(this.rsaPublicPem, 'utf8').toString('base64'),
                        ecdhPublicKeyB64: this.ownEcdhPubB64,
                        peerId: this.selfPeerId
                    }
                    socket.write(JSON.stringify(handshake) + '\n')
                    this.setupSocketListeners(socket, ip)
                    resolve({ ok: true, ip })
                })

                socket.on('error', (err) => {
                    reject(err)
                })
            })
        })

        ipcMain.on('send-peer-message', (_event, { toIp, text }) => {
            const peer = this.peersByIp.get(toIp)
            if (!peer || !peer.socket) return

            try {
                let payload: any = { type: 'msg' }
                if (peer.aesKey) {
                    const iv = crypto.randomBytes(12)
                    const cipher = crypto.createCipheriv('aes-256-gcm', peer.aesKey, iv)
                    let ciphertext = cipher.update(text, 'utf8', 'base64')
                    ciphertext += cipher.final('base64')
                    payload.ivB64 = iv.toString('base64')
                    payload.ciphertextB64 = ciphertext
                    payload.tagB64 = cipher.getAuthTag().toString('base64')
                } else if (peer.rsaPublicPem) {
                    const buffer = Buffer.from(text, 'utf8')
                    const encrypted = crypto.publicEncrypt(
                        { key: peer.rsaPublicPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
                        buffer
                    )
                    payload.ciphertextB64 = encrypted.toString('base64')
                }

                peer.socket.write(JSON.stringify(payload) + '\n')
            } catch (e) {
                console.error('Failed to send message:', e)
            }
        })
    }
}
