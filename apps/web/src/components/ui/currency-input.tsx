import { cn } from '@/lib/utils'
import * as React from 'react'

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
        e.target.value = formatBRL(e.target.value)
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

/**
 * Format a raw user-typed string into Brazilian accounting format (pt-BR).
 * Strips dot separators already in the string, adds them back correctly.
 * Examples: "1234" → "1.234"  |  "1234,5" → "1.234,5"  |  "1234,56" → "1.234,56"
 */
export function formatBRL(raw: string): string {
  // Keep only digits and commas; removes any dot separators already present
  const clean = raw.replace(/[^\d,]/g, '')
  const parts = clean.split(',')
  // Add dot thousands separators to the integer part
  const intPart = (parts[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  // If the user typed a comma, preserve decimal part (max 2 digits)
  if (parts.length >= 2) {
    return `${intPart},${parts[1].slice(0, 2)}`
  }
  return intPart
}

/** Parse a Brazilian-format currency string → float. "1.234,56" → 1234.56 */
export function parseCurrency(value: string): number {
  if (!value) return 0
  return Number.parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

export { CurrencyInput }
