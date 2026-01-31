import { useState } from 'react'
import { Icons } from './icons'

interface ConnectModalProps {
    isOpen: boolean
    onClose: () => void
    onConnect: (ip: string) => Promise<void>
}

export default function ConnectModal({
    isOpen,
    onClose,
    onConnect
}: ConnectModalProps) {
    const [ip, setIp] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (!ip.trim()) return

        // Basic IP validation
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
        if (!ipRegex.test(ip.trim())) {
            setError('Invalid IP Format')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            await onConnect(ip.trim())
            onClose()
            setIp('')
        } catch (e) {
            setError('Connection Timed Out')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />
            <div className="relative w-full max-w-sm bg-[#0F0F11] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                            <Icons.Plus className="w-5 h-5 text-white/70" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Direct Link</h3>
                            <p className="text-[10px] text-muted-foreground font-mono">Manual IP Connection</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] text-white/40 font-mono uppercase pl-1">Target Address</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. 192.168.1.5"
                                value={ip}
                                onChange={(e) => {
                                    setIp(e.target.value)
                                    setError('')
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSubmit()
                                    if (e.key === 'Escape') onClose()
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 placeholder:text-white/10 font-mono transition-all"
                            />
                            {error && (
                                <p className="text-[10px] text-red-500 font-bold pl-1 animate-fade-in">{error}</p>
                            )}
                        </div>

                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !ip}
                                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {isLoading ? (
                                    <Icons.Refresh className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <span>Connect</span>
                                        <Icons.ArrowRight className="w-3 h-3" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
