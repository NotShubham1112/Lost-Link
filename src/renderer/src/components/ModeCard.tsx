import { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Icons } from './icons'

interface ModeCardProps {
    title: string
    description: string
    icon: LucideIcon
    features: string[]
    isComingSoon?: boolean
    onClick?: () => void
    className?: string
}

export default function ModeCard({
    title,
    description,
    icon: Icon,
    features,
    isComingSoon = false,
    onClick,
    className
}: ModeCardProps) {
    return (
        <div
            onClick={isComingSoon ? undefined : onClick}
            className={cn(
                "relative group p-6 rounded-xl border transition-all duration-500",
                "bg-card/30 hover:bg-card/60 backdrop-blur-xl",
                isComingSoon
                    ? "border-border/20 opacity-40 cursor-not-allowed"
                    : "border-border/40 hover:border-white/20 cursor-pointer hover:shadow-2xl hover:-translate-y-2 hover:bg-white/[0.02]",
                className
            )}
        >
            {isComingSoon && (
                <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 text-[10px] font-bold text-yellow-500 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                        COMING SOON
                    </span>
                </div>
            )}

            <div className="mb-4 p-3 w-12 h-12 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6 text-foreground" />
            </div>

            <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-glow transition-all">
                {title}
            </h3>

            <p className="text-sm text-muted-foreground mb-6 h-10">
                {description}
            </p>

            <ul className="space-y-2">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-center text-xs text-muted-foreground/80">
                        <Icons.Check className="w-3 h-3 mr-2 text-green-500/70" />
                        {feature}
                    </li>
                ))}
            </ul>
        </div>
    )
}
