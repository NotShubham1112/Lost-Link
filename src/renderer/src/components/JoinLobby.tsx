import { Icons } from './icons'
import { useState, useEffect } from 'react'

interface JoinLobbyProps {
    onBack: () => void
    username: string
}

export default function JoinLobby({ onBack, username }: JoinLobbyProps) {
    const [lobbies, setLobbies] = useState<any[]>([])
    const [isScanning, setIsScanning] = useState(true)

    // @ts-ignore
    const { api } = window

    useEffect(() => {
        const cleanup = api.onUdpPeer((peer: any) => {
            if (!isScanning) return

            // Only show peers that are hosting a lobby
            if (peer.lobbyName) {
                setLobbies((prev) => {
                    const exists = prev.find(l => l._ip === peer._ip)
                    if (exists) {
                        // Update existing lobby state (e.g. if locked status changes)
                        return prev.map(l => l._ip === peer._ip ? { ...l, ...peer } : l)
                    }
                    return [...prev, peer]
                })
            }
        })
        return cleanup
    }, [isScanning])

    const handleJoin = async (lobby: any) => {
        if (lobby.isLobbyLocked) {
            alert("This lobby is currently locked by the host.")
            return
        }
        try {
            const res = await api.connectPeer(lobby._ip, lobby.chatPort)
            if (res.ok) {
                alert(`Joined ${lobby.lobbyName}! Go to Chat to communicate.`)
                // In a real app we'd navigate to a specific lobby view, but for now sending to Chat is fine
                // The user needs to manually go to "Open P2P Chat" or we can navigate them home then chat
                onBack()
            }
        } catch (e) {
            console.error('Failed to join lobby', e)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center p-8 animate-fade-in font-sans">
            {/* Header */}
            <div className="w-full max-w-4xl flex items-center justify-between mb-12">
                <button
                    onClick={onBack}
                    className="p-3 hover:bg-white/5 rounded-xl transition-all group"
                >
                    <Icons.Back className="w-5 h-5 text-muted-foreground group-hover:text-white" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-2xl font-black text-white uppercase tracking-wider">Lobby Browser</h1>
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[0.2em]">Find Local Hosts</span>
                </div>
                <div className="w-10" />
            </div>

            <div className="w-full max-w-3xl">
                {/* Scanner Interface */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">
                            {isScanning ? 'Scanning Network...' : 'Scan Paused'}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsScanning(!isScanning)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-all"
                    >
                        <Icons.Refresh className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Grid */}
                {lobbies.length === 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between animate-pulse">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/5" />
                                    <div className="space-y-2">
                                        <div className="w-32 h-4 rounded-full bg-white/5" />
                                        <div className="w-20 h-3 rounded-full bg-white/5" />
                                    </div>
                                </div>
                                <div className="w-24 h-10 rounded-xl bg-white/5" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {lobbies.map((lobby, i) => (
                            <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between hover:bg-white/10 transition-all group">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-white/5">
                                        <Icons.Users className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{lobby.lobbyName}</h3>
                                        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-muted-foreground/60">
                                            <span>HOST: {lobby.username}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/20" />
                                            <span>{lobby._ip}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleJoin(lobby)}
                                    disabled={lobby.isLobbyLocked}
                                    className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center space-x-2 ${lobby.isLobbyLocked
                                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                        : 'bg-green-500 hover:bg-green-400 text-black shadow-lg hover:shadow-green-500/20'
                                        }`}
                                >
                                    {lobby.isLobbyLocked ? (
                                        <>
                                            <Icons.Lock className="w-3 h-3" />
                                            <span>Locked</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Join</span>
                                            <Icons.ArrowRight className="w-3 h-3" />
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
