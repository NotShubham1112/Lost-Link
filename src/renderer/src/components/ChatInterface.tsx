import { Icons } from './icons'
import { useState, useEffect, useRef } from 'react'
import SettingsModal from './SettingsModal'
import ConnectModal from './ConnectModal'

// @ts-ignore
const { api } = window

interface ChatInterfaceProps {
    onBack: () => void
    onLogout?: () => void
    deviceID?: string
    deviceIP?: string
    username?: string
}

export default function ChatInterface({
    onBack,
    onLogout,
    deviceID: initialDeviceID = "Unknown",
    deviceIP: initialDeviceIP = "0.0.0.0",
    username = "User"
}: ChatInterfaceProps) {
    const [peers, setPeers] = useState<any[]>([])
    const [activePeer, setActivePeer] = useState<any | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [inputText, setInputText] = useState('')
    const [localIP, setLocalIP] = useState(initialDeviceIP)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isConnectOpen, setIsConnectOpen] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        api.getLocalIP().then(setLocalIP)

        const cleanupUdp = api.onUdpPeer((peer: any) => {
            setPeers((prev) => {
                const exists = prev.find(p => p._ip === peer._ip)
                if (exists) {
                    return prev.map(p => p._ip === peer._ip ? { ...p, ...peer } : p)
                }
                return [...prev, peer]
            })
        })

        const cleanupConnected = api.onPeerConnected((data: any) => {
            console.log('[UI] Peer connected:', data)
            setPeers(prev => {
                const exists = prev.find(p => p._ip === data.ip)
                if (exists) {
                    return prev.map(p => p._ip === data.ip ? { ...p, connected: true, aes: data.aes } : p)
                } else {
                    // Add new peer if manually connected
                    return [...prev, { _ip: data.ip, username: data.displayName, connected: true, aes: data.aes }]
                }
            })

            // Critical: If this is the active peer, strictly update their session state
            setActivePeer((prev: any) => {
                if (prev?.ip === data.ip) {
                    return { ...prev, connected: true, aes: data.aes }
                }
                return prev
            })
        })

        const cleanupMessage = api.onPeerMessage((msg: any) => {
            setMessages(prev => [...prev, { ...msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
        })

        const cleanupDisconnected = api.onPeerDisconnected((data: any) => {
            setPeers((prev: any[]) => prev.filter(p => p._ip !== data.ip))
            setActivePeer((prev: any) => prev?.ip === data.ip ? null : prev)
        })

        return () => {
            cleanupUdp()
            cleanupConnected()
            cleanupMessage()
            cleanupDisconnected()
        }
    }, [])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const connectToIp = async (ip: string, namePlaceholder: string = 'Unknown', port?: number) => {
        try {
            const res = await api.connectPeer(ip, port)
            if (res.ok) {
                // We optimistically set active peer. The onPeerConnected event will confirm AES status shortly.
                setActivePeer({ ip: ip, name: namePlaceholder, connected: true, aes: res.aes || false })
                setMessages([])
            }
        } catch (e) {
            console.error('Connection failed', e)
        }
    }

    const handleConnect = async (peer: any) => {
        await connectToIp(peer._ip, peer.username, peer.chatPort)
    }

    const handleSendMessage = () => {
        if (!inputText || !activePeer) return
        api.sendPeerMessage(activePeer.ip, inputText)
        setMessages(prev => [...prev, {
            from: 'Me',
            text: inputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }])
        setInputText('')
    }

    const handleRefresh = () => {
        setPeers([])
        setMessages([])
        setActivePeer(null)
        // Discovery will naturally repopulate from UDP broadcasts
    }

    const handleClearHistory = () => {
        setMessages([])
        setIsMenuOpen(false)
    }

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden animate-fade-in font-sans selection:bg-white/10">
            {/* Top Header */}
            <header className="h-16 border-b border-border/80 flex items-center justify-between px-6 bg-card/10 backdrop-blur-md select-none shrink-0 z-50">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={onBack}
                        className="p-2.5 hover:bg-white/5 rounded-xl transition-all group active:scale-95"
                    >
                        <Icons.Back className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
                    </button>

                    <div className="flex items-center space-x-4">
                        <div className="h-10 w-[1px] bg-border/50" />
                        <div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <span className="font-black text-sm tracking-widest text-white uppercase italic">Lost-Link P2P</span>
                                <span className="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground border border-white/5 tracking-tighter">
                                    AES-256-GCM
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] font-mono text-muted-foreground/60 mt-1">
                                <span className="text-white/40">{initialDeviceID.slice(0, 8)}</span>
                                <span className="h-1 w-1 rounded-full bg-white/10" />
                                <span>{peers.length} Nodes Discovered</span>
                                <span className="h-1 w-1 rounded-full bg-white/10" />
                                <span>Relay: <span className="text-foreground/60 font-bold">{localIP}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 px-4 py-1.5 bg-green-500/5 border border-green-500/10 rounded-full">
                        <Icons.Activity className="w-3.5 h-3.5 text-green-500/70" />
                        <span className="text-[10px] font-black text-green-500/80 tracking-widest uppercase">Encryption Core: Active</span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-90 group"
                    >
                        <Icons.Refresh className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded-full transition-all hover:rotate-90 duration-700 active:scale-90"
                    >
                        <Icons.Settings className="w-4 h-4" />
                    </button>

                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        username={username}
                        deviceID={initialDeviceID}
                        localIP={localIP}
                        onUpdateProfile={async (name) => {
                            await api.setDisplayName(name)
                            window.location.reload()
                        }}
                    />

                    <ConnectModal
                        isOpen={isConnectOpen}
                        onClose={() => setIsConnectOpen(false)}
                        onConnect={async (ip) => {
                            await connectToIp(ip, 'Manual Link')
                        }}
                    />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Peer Discovery */}
                <aside className="w-[320px] border-r border-border/60 flex flex-col bg-card/5 backdrop-blur-2xl shrink-0">
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Local Nodes</h3>
                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-md text-white/40 border border-white/5 font-mono">
                                {peers.length < 10 ? `0${peers.length}` : peers.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 pb-6 custom-scrollbar">
                        {peers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-4">
                                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5 animate-pulse">
                                    <Icons.Wifi className="w-8 h-8 text-muted-foreground/40" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-foreground">Discovery Mode</p>
                                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed px-4">
                                        Broadcasting UDP heartbeat. Waiting for peers...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-1.5 p-1">
                                {peers.map(p => {
                                    const isActive = activePeer?.ip === p._ip;
                                    return (
                                        <button
                                            key={p._ip}
                                            onClick={() => handleConnect(p)}
                                            className={`group flex items-center p-4 rounded-xl transition-all border ${isActive
                                                ? 'bg-white/10 border-white/10 shadow-lg translate-x-1'
                                                : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                                                }`}
                                        >
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300">
                                                    <span className="text-sm font-black text-white/50">{p.username[0].toUpperCase()}</span>
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${p.connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                                            </div>
                                            <div className="flex flex-col items-start ml-4 overflow-hidden">
                                                <span className={`text-sm font-bold truncate w-full transition-colors ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                                                    {p.username}
                                                </span>
                                                <span className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">{p._ip}</span>
                                            </div>
                                            {isActive && (
                                                <div className="ml-auto">
                                                    <Icons.Shield className="w-3.5 h-3.5 text-green-500/60" />
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-6 mt-auto border-t border-border/20">
                        <div className="bg-white/5 w-full p-4 rounded-2xl border border-white/5 flex items-center space-x-4 group hover:bg-white/10 transition-colors cursor-help">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                <Icons.Lock className="w-5 h-5 text-white/80 group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase text-white tracking-widest">Post-Quantum Ready</div>
                                <div className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5">Ephemeral keys derived via ECDH P-256.</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Chat Area */}
                <main className="flex-1 flex flex-col bg-background relative selection:bg-white/5">
                    {/* Chat Header */}
                    <div className="h-16 border-b border-border/40 flex items-center px-8 bg-card/[0.02]">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4 border border-white/5">
                            <Icons.Signal className="w-5 h-5 text-white/70" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white tracking-wide uppercase italic">
                                {activePeer ? activePeer.name : 'Network Lobby'}
                            </h2>
                            <div className="flex items-center text-[10px] text-muted-foreground/50 font-bold tracking-widest mt-0.5">
                                <Icons.Lock className="w-3 h-3 mr-1.5 text-green-500/40" />
                                <span className="uppercase">{activePeer?.aes ? 'AES-256-GCM (ENCRYPTED LINK)' : 'PENDING SECURE HANDSHAKE'}</span>
                            </div>
                        </div>
                        <div className="ml-auto flex items-center space-x-2">
                            <button
                                onClick={() => setIsConnectOpen(true)}
                                className="p-2.5 hover:bg-white/5 rounded-xl text-muted-foreground transition-all active:scale-90"
                            >
                                <Icons.Plus className="w-5 h-5" />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className={`p-2.5 hover:bg-white/5 rounded-xl text-muted-foreground transition-all active:scale-90 ${isMenuOpen ? 'bg-white/10 text-white' : ''}`}
                                >
                                    <Icons.More className="w-5 h-5" />
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-fade-in py-2 backdrop-blur-xl">
                                        <button
                                            onClick={handleClearHistory}
                                            className="w-full text-left px-4 py-3 text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center space-x-3"
                                        >
                                            <Icons.Refresh className="w-4 h-4 text-white/30" />
                                            <span>Clear History</span>
                                        </button>
                                        <div className="h-[1px] bg-border/40 mx-2 my-1" />
                                        <button
                                            onClick={onLogout}
                                            className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center space-x-3"
                                        >
                                            <Icons.Back className="w-4 h-4 text-red-500/50" />
                                            <span>Terminiate Session</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div
                        className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl" />
                                    <Icons.Activity className="w-20 h-20 text-muted-foreground/10 relative z-10 animate-pulse" />
                                </div>
                                <h3 className="text-3xl font-black tracking-[0.3em] uppercase mb-4 text-white/20">Secure Link</h3>
                                <p className="text-xs font-bold tracking-widest text-muted-foreground/40 uppercase max-w-[200px] leading-relaxed">
                                    Start typing to relay data via peer-to-peer mesh.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-6">
                                {messages.map((m, i) => {
                                    const isMe = m.from === 'Me';
                                    return (
                                        <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-fade-in`}>
                                            <div className={`flex items-center space-x-2 mb-2 px-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{m.from}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[9px] font-mono text-muted-foreground/30">{m.time}</span>
                                            </div>
                                            <div className={`relative px-5 py-3 rounded-2xl text-sm leading-relaxed max-w-[70%] transition-all duration-300 ${isMe
                                                ? 'bg-gradient-to-br from-white/10 to-white/5 text-white rounded-tr-none border border-white/5 shadow-xl hover:translate-x-[-4px]'
                                                : 'bg-card/40 border border-border/40 text-foreground/90 rounded-tl-none hover:translate-x-[4px]'
                                                }`}>
                                                {m.text}
                                                <div className={`absolute top-0 ${isMe ? '-right-1.5 border-l-white/10' : '-left-1.5 border-r-card/40'} border-8 border-transparent`} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        <div ref={chatEndRef} className="h-4" />
                    </div>

                    {/* Input Area */}
                    <div className="p-8 pb-10 border-t border-border/30 bg-card/[0.01]">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-white/5 to-transparent rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-all duration-1000" />

                            <button className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-white transition-all p-2 active:scale-90">
                                <Icons.Attachment className="w-5 h-5" />
                            </button>

                            <input
                                type="text"
                                placeholder={activePeer ? `Transmit secure message to ${activePeer.name}...` : "Select a node from discovery to establish link..."}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={!activePeer}
                                className="w-full bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl py-5 pl-16 pr-20 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-white/20 transition-all placeholder:text-muted-foreground/20 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-inner"
                            />

                            <button
                                onClick={handleSendMessage}
                                disabled={!activePeer || !inputText.trim()}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-black bg-white rounded-xl p-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-0 shadow-lg"
                            >
                                <Icons.Send className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between mt-5 px-2">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">Live Discovery</span>
                                </div>
                                <div className="h-3 w-[1px] bg-white/10" />
                                <div className="flex items-center space-x-1.5">
                                    <Icons.Wifi className="w-3 h-3 text-muted-foreground/30" />
                                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">{peers.length} Nodes</span>
                                </div>
                            </div>

                            {peers.length === 0 && (
                                <span className="text-[10px] text-yellow-500/60 font-black uppercase tracking-tighter italic">Warning: Isolated Node. Scan ongoing.</span>
                            )}

                            {activePeer && (
                                <div className="flex items-center space-x-2 text-[10px] text-green-500/60 font-black uppercase tracking-widest">
                                    <Icons.Shield className="w-3 h-3" />
                                    <span>P2P Session Secured</span>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}} />
        </div>
    )
}
