import { Icons } from './icons'
import { useState, useEffect, useRef } from 'react'

// @ts-ignore
const { api } = window

interface ChatInterfaceProps {
    onBack: () => void
    deviceID?: string
    deviceIP?: string
}

export default function ChatInterface({
    onBack,
    deviceID: initialDeviceID = "Unknown",
    deviceIP: initialDeviceIP = "0.0.0.0"
}: ChatInterfaceProps) {
    const [peers, setPeers] = useState<any[]>([])
    const [activePeer, setActivePeer] = useState<any | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [inputText, setInputText] = useState('')
    const [localIP, setLocalIP] = useState(initialDeviceIP)
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        api.getLocalIP().then(setLocalIP)

        api.onUdpPeer((peer: any) => {
            setPeers((prev) => {
                const exists = prev.find(p => p._ip === peer._ip)
                if (exists) return prev
                return [...prev, peer]
            })
        })

        api.onPeerConnected((data: any) => {
            setActivePeer((prev: any) => {
                if (prev?.ip === data.ip) return { ...prev, connected: true, aes: data.aes }
                return prev
            })
        })

        api.onPeerMessage((msg: any) => {
            setMessages(prev => [...prev, { ...msg, time: new Date().toLocaleTimeString() }])
        })

        api.onPeerDisconnected((data: any) => {
            setPeers(prev => prev.filter(p => p._ip !== data.ip))
            if (activePeer?.ip === data.ip) setActivePeer(null)
        })
    }, [])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleConnect = async (peer: any) => {
        try {
            const res = await api.connectPeer(peer._ip)
            if (res.ok) {
                setActivePeer({ ip: peer._ip, name: peer.username, connected: true })
            }
        } catch (e) {
            console.error('Connection failed', e)
        }
    }

    const handleSendMessage = () => {
        if (!inputText || !activePeer) return
        api.sendPeerMessage(activePeer.ip, inputText)
        setMessages(prev => [...prev, { from: 'Me', text: inputText, time: new Date().toLocaleTimeString() }])
        setInputText('')
    }
    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden animate-fade-in">
            {/* Top Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/20 select-none">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                    >
                        <Icons.Back className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
                    </button>

                    <div className="flex items-center space-x-3">
                        <div className="h-8 w-[1px] bg-border mr-1" />
                        <div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="font-bold text-sm tracking-wide text-white">P2P LAN MODE</span>
                                <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground border border-white/5">
                                    SECURE MESH
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] font-mono text-muted-foreground mt-0.5">
                                <span>{initialDeviceID}</span>
                                <span className="text-white/20">•</span>
                                <span>{peers.length} Peers Discovered</span>
                                <span className="text-white/20">•</span>
                                <span className="text-muted-foreground/80">Your IP: <span className="text-foreground">{localIP}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                        <Icons.Activity className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] font-bold text-green-500 tracking-wider">NETWORK ALIVE</span>
                    </div>
                    <button className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-full transition-all">
                        <Icons.Refresh className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-full transition-all hover:rotate-90 duration-500">
                        <Icons.Settings className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Peer Discovery */}
                <aside className="w-[280px] border-r border-border flex flex-col bg-card/10">
                    <div className="p-4 flex items-center justify-between border-b border-border/50">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Peers Discovered</h3>
                        <button className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-white transition-colors">
                            <Icons.Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {peers.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50 h-full">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 animate-pulse">
                                    <Icons.Wifi className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="font-medium text-sm text-foreground mb-1">Searching for peers...</p>
                                <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                                    Make sure other devices are on the same Wi-Fi.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col p-2 space-y-1">
                                {peers.map(p => (
                                    <button
                                        key={p._ip}
                                        onClick={() => handleConnect(p)}
                                        className={`flex items-center p-3 rounded-lg transition-all ${activePeer?.ip === p._ip ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-500 mr-3 shrink-0" />
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="text-sm font-bold text-white truncate w-full">{p.username}</span>
                                            <span className="text-[10px] font-mono text-muted-foreground">{p._ip}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 mt-auto">
                        <div className="bg-card w-full p-3 rounded-lg border border-border flex items-center space-x-3">
                            <Icons.Shield className="w-8 h-8 text-white" />
                            <div>
                                <div className="text-[10px] font-black uppercase text-white">End-To-End Secure</div>
                                <div className="text-[9px] text-muted-foreground">Your messages are encrypted per peer link.</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Chat Area */}
                <main className="flex-1 flex flex-col bg-background relative">
                    {/* Chat Header */}
                    <div className="h-14 border-b border-border flex items-center px-6">
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center mr-3 border border-white/5">
                            <Icons.Signal className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-wide">{activePeer ? activePeer.name : 'LAN MESH GROUP'}</h2>
                            <div className="flex items-center text-[10px] text-muted-foreground">
                                <Icons.Lock className="w-2.5 h-2.5 mr-1 text-muted-foreground/70" />
                                <span className="font-mono tracking-widest">{activePeer?.aes ? 'AES-256-GCM ACTIVE' : 'OPEN MESH BROADCAST'}</span>
                            </div>
                        </div>
                        <div className="ml-auto">
                            <button className="p-2 hover:bg-white/5 rounded-full text-muted-foreground">
                                <Icons.More className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <Icons.Activity className="w-16 h-16 mb-6" />
                                <h3 className="text-2xl font-black tracking-[0.2em] uppercase mb-4">Network Active</h3>
                                <p className="text-sm font-medium tracking-wide">
                                    Broadcast a message to everyone on your local network.
                                </p>
                            </div>
                        ) : (
                            messages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.from === 'Me' ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="text-[10px] font-bold text-muted-foreground">{m.from}</span>
                                        <span className="text-[9px] text-muted-foreground/50">{m.time}</span>
                                    </div>
                                    <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${m.from === 'Me' ? 'bg-white/10 text-white rounded-tr-none' : 'bg-card border border-border text-foreground rounded-tl-none'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-border bg-card/5">
                        <div className="relative group">
                            <button className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors p-1">
                                <Icons.Attachment className="w-5 h-5" />
                            </button>
                            <input
                                type="text"
                                placeholder={activePeer ? `Message ${activePeer.name}...` : "Select a peer to start chatting..."}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={!activePeer}
                                className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-14 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all placeholder:text-muted-foreground/50 disabled:opacity-50"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!activePeer || !inputText}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-white transition-colors p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-0"
                            >
                                <Icons.Send className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center justify-between mt-2 px-2">
                            <div className="flex items-center space-x-2">
                                <Icons.Wifi className="w-3 h-3 text-muted-foreground/50" />
                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Scanning Network</span>
                            </div>
                            <span className="text-[10px] text-yellow-500/80 font-medium">No active peers detected. Check your connection.</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
