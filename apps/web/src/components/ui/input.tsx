import * as React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: LucideIcon
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, icon: Icon, ...props }, ref) => (
        <div className="relative">
            {Icon && (
                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            )}
            <input
                type={type}
                className={cn(
                    /* 44pt touch target on mobile, slightly smaller on desktop */
                    'flex w-full rounded-xl border bg-transparent',
                    'h-12 px-4 text-[16px]',
                    'sm:h-10 sm:px-3 sm:text-[13px] sm:rounded-lg',
                    'transition-colors placeholder:text-muted-foreground/50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    /* 16px font on mobile prevents iOS zoom on focus */
                    Icon && 'pl-10 sm:pl-9',
                    className,
                )}
                ref={ref}
                {...props}
            />
        </div>
    ),
)
Input.displayName = 'Input'

export { Input }
