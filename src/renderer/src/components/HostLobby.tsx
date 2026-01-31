import { Icons } from './icons'
import { useState, useEffect } from 'react'

interface HostLobbyProps {
    onBack: () => void
    username: string
}

export default function HostLobby({ onBack, username }: HostLobbyProps) {
    const [lobbyName] = useState(`${username}'s Lobby`)
    const [isLocked, setIsLocked] = useState(false)
    const [connectedUsers, setConnectedUsers] = useState<any[]>([])

    // @ts-ignore
    const { api } = window

    // Initialize lobby on mount
    useEffect(() => {
        // Start hosting
        api.setLobbyState({ isHosting: true, name: lobbyName, isLocked: false })

        // Listen for new connections
        const cleanup = api.onPeerConnected((data: any) => {
            setConnectedUsers(prev => {
                if (prev.find(p => p.ip === data.ip)) return prev
                return [...prev, { name: data.displayName, ip: data.ip }]
            })
        })

        const cleanupDisc = api.onPeerDisconnected((data: any) => {
            setConnectedUsers(prev => prev.filter(u => u.ip !== data.ip))
        })

        return () => {
            // Stop hosting on unmount
            api.setLobbyState({ isHosting: false })
            cleanup()
            cleanupDisc()
        }
    }, [])

    const toggleLock = () => {
        const newLockState = !isLocked
        setIsLocked(newLockState)
        api.setLobbyState({ isHosting: true, name: lobbyName, isLocked: newLockState })
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
                    <h1 className="text-2xl font-black text-white uppercase tracking-wider">Host Control</h1>
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[0.2em]">Private Session Manager</span>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="w-full max-w-2xl space-y-8">
                {/* Lobby Status Card */}
                <div className="p-8 bg-card/10 backdrop-blur-md border border-white/5 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${isLocked ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{isLocked ? 'LOCKED' : 'BROADCASTING'}</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6 mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                            <Icons.Users className="w-10 h-10 text-white/50" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">{lobbyName}</h2>
                            <p className="text-sm text-muted-foreground/60">Waiting for peers to join...</p>
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={toggleLock}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center space-x-3 transition-all"
                        >
                            {isLocked ? <Icons.Lock className="w-5 h-5 text-red-400" /> : <Icons.Radio className="w-5 h-5 text-green-400" />}
                            <span className="font-bold text-sm text-white/80">{isLocked ? 'Unlock Lobby' : 'Lock Lobby'}</span>
                        </button>
                    </div>
                </div>

                {/* Users List */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-muted-foreground/40 uppercase tracking-widest pl-2">Connected Peers ({connectedUsers.length})</h3>

                    {connectedUsers.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center text-center">
                            <Icons.Search className="w-8 h-8 text-white/10 mb-4" />
                            <p className="text-sm font-bold text-white/30">No users connected</p>
                        </div>
                    ) : (
                        connectedUsers.map((user, i) => (
                            <div key={i} className="p-4 bg-white/5 rounded-xl flex items-center justify-between">
                                <span className="text-white font-bold">{user.name}</span>
                                <button className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-500/20">KICK</button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
