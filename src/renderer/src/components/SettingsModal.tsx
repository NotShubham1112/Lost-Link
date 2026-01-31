import { useState, useEffect } from 'react'
import { Icons } from './icons'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    username: string
    deviceID: string
    localIP: string
    onUpdateProfile: (newName: string) => void
}

export default function SettingsModal({
    isOpen,
    onClose,
    username,
    deviceID,
    localIP,
    onUpdateProfile
}: SettingsModalProps) {
    const [name, setName] = useState(username)
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        setName(username)
    }, [username])

    if (!isOpen) return null

    const handleSave = () => {
        if (name.trim()) {
            onUpdateProfile(name)
            setIsEditing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md bg-[#0F0F11] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                            <Icons.Settings className="w-5 h-5 text-white/70" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Settings</h3>
                            <p className="text-[10px] text-muted-foreground font-mono">System Configuration</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                    >
                        <Icons.Plus className="w-5 h-5 rotate-45" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Profile Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Identity</label>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="text-[9px] text-white/40 font-mono uppercase">Display Name</div>
                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSave()
                                                if (e.key === 'Escape') {
                                                    setName(username)
                                                    setIsEditing(false)
                                                }
                                            }}
                                            onBlur={() => {
                                                handleSave()
                                            }}
                                            className="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-white/30 w-full"
                                        />
                                    ) : (
                                        <div className="font-bold text-white text-sm">{username}</div>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        if (isEditing) handleSave()
                                        else setIsEditing(true)
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                                >
                                    {isEditing ? <Icons.Check className="w-4 h-4 text-green-500" /> : <Icons.Edit className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Network Details */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Network Stats</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                <div className="text-[9px] text-white/40 font-mono uppercase mb-1">Local IP Address</div>
                                <div className="font-mono text-xs text-green-500/80 font-bold">{localIP}</div>
                            </div>
                            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                <div className="text-[9px] text-white/40 font-mono uppercase mb-1">Port Interface</div>
                                <div className="font-mono text-xs text-blue-500/80 font-bold">TCP/UDP 6000</div>
                            </div>
                            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 col-span-2">
                                <div className="text-[9px] text-white/40 font-mono uppercase mb-1">Device Fingerprint</div>
                                <div className="font-mono text-[10px] text-white/60 tracking-wider truncate">{deviceID}</div>
                            </div>
                        </div>
                    </div>

                    {/* App Info */}
                    <div className="pt-2 text-center space-y-1">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Lost-Link v0.1.0</div>
                        <div className="text-[9px] text-white/10">Secure LAN Verification Protocol</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
