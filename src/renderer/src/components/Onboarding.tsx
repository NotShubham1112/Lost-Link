import { useState } from 'react'
import { Icons } from './icons'

interface OnboardingProps {
    onComplete: (name: string) => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
    const [name, setName] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name.trim()) {
            onComplete(name.trim())
        }
    }

    return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 p-6 animate-fade-in">
            <div className="max-w-md w-full">
                <div className="flex flex-col items-center mb-12 text-center">
                    <div className="relative mb-6 group">
                        <div className="absolute inset-0 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all duration-500" />
                        <div className="relative p-4 bg-muted/30 rounded-full border border-white/5">
                            <Icons.Logo className="w-12 h-12 text-white" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-black tracking-tight text-white mb-3">
                        Identify Yourself
                    </h1>
                    <p className="text-muted-foreground text-lg px-4">
                        Choose a name that others on the network will see.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-white/5 rounded-xl blur opacity-30 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200"></div>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Your Display Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="relative w-full bg-card border border-border rounded-xl py-5 px-6 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all placeholder:text-muted-foreground/30 text-white"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-white text-black font-black py-5 rounded-xl text-lg hover:bg-white/90 transition-all disabled:opacity-50 disabled:grayscale transform active:scale-[0.98]"
                    >
                        START SECURE SESSION
                    </button>
                </form>

                <div className="mt-12 text-center space-y-4">
                    <div className="flex items-center justify-center space-x-3 text-[10px] text-muted-foreground/40 font-mono tracking-widest uppercase">
                        <Icons.Shield className="w-3 h-3" />
                        <span>RSA-2048 Identity Keys Generated In-Memory</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/30 leading-relaxed px-8">
                        LostLink operates entirely offline. Your profile and keys never leave your local network.
                    </p>
                </div>
            </div>
        </div>
    )
}
