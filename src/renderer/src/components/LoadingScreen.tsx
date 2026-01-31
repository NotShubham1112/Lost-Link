import { Icons } from './icons'

export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
            <div className="relative mb-8">
                {/* Glowing ring effect */}
                <div className="absolute inset-0 rounded-full bg-white/5 blur-xl transform scale-150 animate-pulse-glow" />

                {/* Spinning border ring */}
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30 border-r-white/30 animate-spin-slow" />

                {/* Central Logo */}
                <div className="relative z-10 p-6 bg-card/30 rounded-full backdrop-blur-sm border border-white/5">
                    <Icons.Logo className="w-16 h-16 text-white opacity-90" />
                </div>
            </div>

            <div className="text-center animate-fade-in">
                <h1 className="text-3xl font-black tracking-[0.2em] text-white mb-2 text-glow">
                    LOSTLINK
                </h1>
                <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                    <Icons.Refresh className="w-3 h-3 animate-spin" />
                    <span className="text-sm font-medium tracking-wide">Initializing Secure Core...</span>
                </div>
            </div>
        </div>
    )
}
