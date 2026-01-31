import { Icons } from './icons'
import ModeCard from './ModeCard'

interface HomePageProps {
    onOpenChat: () => void
    deviceID?: string
}

export default function HomePage({ onOpenChat, deviceID = "41ace774-6bae-43..." }: HomePageProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 animate-fade-in relative selection:bg-white/10">
            {/* Settings Button */}
            <button className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors hover:rotate-90 duration-500">
                <Icons.Settings className="w-5 h-5" />
            </button>

            {/* Header Section */}
            <div className="flex flex-col items-center mb-16 text-center">
                <div className="relative mb-6 group">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all duration-500" />
                    <div className="relative p-4 bg-muted/30 rounded-full border border-white/5 group-hover:scale-105 transition-transform duration-300">
                        <Icons.Logo className="w-10 h-10 text-foreground" />
                    </div>
                </div>

                <h1 className="text-5xl font-black tracking-tight text-white mb-3 drop-shadow-lg">
                    LostLink
                </h1>

                <p className="text-muted-foreground text-lg mb-6 font-medium tracking-wide">
                    Secure Offline LAN Messaging
                </p>

                {/* Status Pill */}
                <div className="flex items-center space-x-2 px-4 py-1.5 bg-card border border-border/50 rounded-full mb-6">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">System Online</span>
                </div>

                <div className="font-mono text-[10px] text-muted-foreground/40 tracking-widest uppercase">
                    Device ID: {deviceID}
                </div>
            </div>

            {/* Mode Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
                <ModeCard
                    title="Start Host Lobby"
                    description="Create a private lobby and control who joins"
                    icon={Icons.Users}
                    isComingSoon={true}
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
                    isComingSoon={true}
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
            <div className="absolute bottom-6 text-center text-[10px] text-muted-foreground/30 space-y-1">
                <p className="font-bold tracking-widest">LOSTLINK V1.0.0</p>
                <p>All communication happens over your local network only</p>
                <p>AES-256-GCM Encrypted • No Cloud Storage • Open Source</p>
            </div>
        </div>
    )
}
