import { useState } from 'react'
import { Icons } from './icons'
import ModeCard from './ModeCard'
import SettingsModal from './SettingsModal'

// @ts-ignore
const { api } = window

interface HomePageProps {
    onOpenChat: () => void
    onOpenHost?: () => void
    onOpenJoin?: () => void
    onLogout?: () => void
    deviceID?: string
    username?: string
}

export default function HomePage({
    onOpenChat,
    onOpenHost,
    onOpenJoin,
    onLogout,
    deviceID = "UNKNOWN",
    username = "Guest"
}: HomePageProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [localIP, setLocalIP] = useState('Loading...')

    const handleOpenSettings = () => {
        api.getLocalIP().then(setLocalIP)
        setIsSettingsOpen(true)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 animate-fade-in relative selection:bg-white/10">
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                username={username}
                deviceID={deviceID}
                localIP={localIP}
                onUpdateProfile={async (name: string) => {
                    await api.setDisplayName(name)
                    window.location.reload()
                }}
            />

            {/* Top Navigation */}
            <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-10">
                <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 backdrop-blur-md">
                    <Icons.Shield className="w-4 h-4 text-green-500/70" />
                    <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Encrypted Session</span>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleOpenSettings}
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-muted-foreground hover:text-white transition-all hover:rotate-90 duration-700 active:scale-90"
                    >
                        <Icons.Settings className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex items-center space-x-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-500 transition-all active:scale-95 group"
                    >
                        <Icons.Refresh className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        <span className="text-xs font-black tracking-widest uppercase">Logout</span>
                    </button>
                </div>
            </div>

            {/* Header Section */}
            <div className="flex flex-col items-center mb-16 text-center z-0">
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-700" />
                    <div className="relative p-6 bg-muted/20 rounded-full border border-white/5 group-hover:scale-105 transition-transform duration-500">
                        <Icons.Logo className="w-12 h-12 text-foreground" />
                    </div>
                </div>

                <div className="mb-2">
                    <span className="text-[10px] font-black tracking-[0.3em] text-muted-foreground/40 uppercase">Authenticated As</span>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{username}</h2>
                </div>

                <h1 className="text-6xl font-black tracking-tighter text-white mb-4 drop-shadow-2xl">
                    LostLink
                </h1>
            </div>

            {/* Mode Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4 z-0">
                <ModeCard
                    title="Start Host Lobby"
                    description="Create a private lobby and control who joins"
                    icon={Icons.Users}
                    isComingSoon={false}
                    onClick={onOpenHost}
                    features={[
                        "Approve/deny join requests",
                        "Kick users and lock lobby",
                        "Password protection"
                    ]}
                />

                <ModeCard
                    title="Join Host Lobby"
                    description="Discover and join existing host lobbies"
                    icon={Icons.Wifi}
                    isComingSoon={false}
                    onClick={onOpenJoin}
                    features={[
                        "Auto-discover LAN hosts",
                        "Secure request to join",
                        "Encrypted messaging"
                    ]}
                />

                <ModeCard
                    title="Open P2P LAN Chat"
                    description="Join an open peer-to-peer group chat"
                    icon={Icons.Radio}
                    onClick={onOpenChat}
                    features={[
                        "Direct peer communication",
                        "Auto peer discovery",
                        "No host approval needed"
                    ]}
                />
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center text-[10px] text-muted-foreground/30 space-y-2 z-0">
                <p className="font-bold tracking-widest">LOSTLINK V1.0.0 • {deviceID}</p>
                <p>All communication happens over your local network only</p>
                <p>AES-256-GCM Encrypted • No Cloud Storage • Open Source</p>
            </div>
        </div>
    )
}
