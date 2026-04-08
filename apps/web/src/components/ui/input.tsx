import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import * as React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon: Icon, ...props }, ref) => (
    <div className="relative has-[:disabled]:opacity-50">
      {Icon && (
        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
      )}
      <input
        type={type}
        className={cn(
          /* 44pt touch target on mobile, slightly smaller on desktop */
          'flex w-full rounded-xl border bg-transparent',
          'h-12 px-4 text-[16px]',
          'sm:h-10 sm:px-3 sm:text-[13px] sm:rounded-lg',
          /*
            Animated focus border: border-color transitions from muted to ring
            in 150ms, matching the native iOS text field highlight duration.
            Combined with ring-2 (0.5pt→1.5pt shadow) for the animated width effect.
          */
          'transition-[border-color,box-shadow] duration-150 ease-out',
          'placeholder:text-muted-foreground/50',
          'focus-visible:outline-none focus-visible:border-ring/50',
          'focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed',
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
