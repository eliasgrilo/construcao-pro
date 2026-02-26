import * as React from 'react'
import { cn } from '@/lib/utils'

const CurrencyInput = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, onChange, ...props }, ref) => (
    <div className="relative">
        <span className="pointer-events-none select-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px] sm:text-[13px]">
            R$
        </span>
        <input
            {...props}
            ref={ref}
            type="text"
            inputMode="decimal"
            onChange={(e) => {
                e.target.value = e.target.value.replace(/[^\d,\.]/g, '')
                onChange?.(e)
            }}
            className={cn(
                'flex w-full rounded-xl border bg-transparent',
                'h-12 pl-10 pr-4 text-[16px]',
                'sm:h-10 sm:pl-9 sm:pr-3 sm:text-[13px] sm:rounded-lg',
                'transition-colors placeholder:text-muted-foreground/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'tabular-nums',
                className,
            )}
        />
    </div>
))
CurrencyInput.displayName = 'CurrencyInput'

/** Parse a Brazilian-format currency string to a float. "1.234,56" → 1234.56 */
export function parseCurrency(value: string): number {
    if (!value) return 0
    // Remove thousand separators (dots) and replace comma decimal with period
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

export { CurrencyInput }
