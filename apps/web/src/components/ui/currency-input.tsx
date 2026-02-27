import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * CurrencyInput — Apple-style Brazilian currency input with R$ prefix.
 *
 * The `paddingLeft` is always set via inline style (2.75rem) so it can never
 * be accidentally overridden by a Tailwind `px-*` class in `className`.
 * All other visual props (bg, border, radius, height, font-size, shadow…)
 * can still be customised through `className` as usual.
 */
const CurrencyInput = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, style, onChange, ...props }, ref) => (
    <div className="relative">
        {/* R$ prefix — left-4 aligns with the 2.75rem inline paddingLeft on the input */}
        <span className="pointer-events-none select-none absolute left-4 top-1/2 -translate-y-1/2 z-10 leading-none text-[15px] font-medium text-muted-foreground/50">
            R$
        </span>

        <input
            {...props}
            ref={ref}
            type="text"
            inputMode="decimal"
            onChange={(e) => {
                e.target.value = e.target.value.replace(/[^\d,.]/g, '')
                onChange?.(e)
            }}
            /* inline style wins over any Tailwind px-* / pl-* from className */
            style={{ paddingLeft: '2.75rem', ...style }}
            className={cn(
                /* base — can all be overridden by className */
                'flex w-full rounded-[16px] border',
                'h-14 sm:h-[52px] pr-4 text-[16px]',
                'bg-black/[0.03] dark:bg-white/[0.03]',
                'border-border/40',
                'transition-all',
                'placeholder:text-muted-foreground/35',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                'focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'tabular-nums font-semibold',
                className,
            )}
        />
    </div>
))
CurrencyInput.displayName = 'CurrencyInput'

/** Parse a Brazilian-format currency string → float. "1.234,56" → 1234.56 */
export function parseCurrency(value: string): number {
    if (!value) return 0
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

export { CurrencyInput }
