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

    private startUdpDiscovery(): void {
        this.udpSocket = dgram.createSocket('udp4')
        this.udpSocket.on('message', (msg, rinfo) => {
            try {
                const payload = JSON.parse(msg.toString())
                if (payload.app === 'Lost-Link') {
                    payload._ip = rinfo.address
                    this.mainWindow?.webContents.send('udp-peer', payload)
                }
            } catch (e) {
                // Ignore non-JSON or other app messages
            }
        })

        this.udpSocket.bind(BROADCAST_PORT, () => {
            this.udpSocket?.setBroadcast(true)
        })

        setInterval(async () => {
            const payload = {
                app: 'Lost-Link',
                username: this.selfDisplayName,
                status: 'online',
                chatPort: CHAT_PORT,
                peerId: this.selfPeerId
            }
            const message = Buffer.from(JSON.stringify(payload))
            this.udpSocket?.send(message, 0, message.length, BROADCAST_PORT, '255.255.255.255')
        }, BROADCAST_INTERVAL)
    }

    private startChatServer(): void {
        this.chatServer = net.createServer((socket) => {
            const remoteIp = socket.remoteAddress?.replace(/^::ffff:/, '') || ''
            socket.setKeepAlive(true)

            this.setupSocketListeners(socket, remoteIp)
        })

        this.chatServer.listen(CHAT_PORT, () => {
            console.log(`Chat server listening on port ${CHAT_PORT}`)
        })
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
                    const shared = this.ecdh.computeSecret(Buffer.from(msg.ecdhPublicKeyB64, 'base64'))
                    peerInfo.aesKey = crypto.hkdfSync('sha256', shared, Buffer.from('lost-link'), Buffer.alloc(0), 32)
                }

                this.peersByIp.set(remoteIp, peerInfo)

                // Send back our handshake if we haven't already (simplified logic)
                // In a real flow, we might need to track if we initiated or received
                if (!msg.isResponse) {
                    const resp = {
                        type: 'handshake',
                        isResponse: true,
                        displayName: this.selfDisplayName,
                        rsaPublicKeyB64: Buffer.from(this.rsaPublicPem, 'utf8').toString('base64'),
                        ecdhPublicKeyB64: this.ownEcdhPubB64,
                        peerId: this.selfPeerId
                    }
                    socket.write(JSON.stringify(resp) + '\n')
                }

                this.mainWindow?.webContents.send('udp-peer-connected', {
                    ip: remoteIp,
                    displayName: peerInfo.displayName,
                    aes: !!peerInfo.aesKey
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

    private setupIpcHandlers(): void {
        ipcMain.handle('get-local-ip', () => this.getLocalIP())

        ipcMain.handle('connect-peer', async (_event, { ip }) => {
            return new Promise((resolve, reject) => {
                if (this.peersByIp.has(ip)) {
                    return resolve({ ok: true, ip, alreadyConnected: true })
                }

                const socket = net.connect({ host: ip, port: CHAT_PORT }, () => {
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
