import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * CurrencyInput — Apple-style Brazilian currency input with R$ prefix.
 *
 * ROOT CAUSE FIX (comma bug):
 *   react-hook-form's `register('field', { setValueAs: parseCurrency })` converts
 *   the formatted string back to a number on every onChange, e.g. "1.234," → 1234.
 *   On the next render, the `value` prop is set to `1234`, wiping the trailing comma
 *   the user just typed.
 *
 *   Solution: CurrencyInput keeps its own `displayValue` string state.
 *   • Outgoing onChange fires with a synthetic event whose value is the *formatted*
 *     BRL string, then setValueAs(parseCurrency) turns it into a number for the form.
 *   • The *displayed* value always comes from internal state, so the comma is never lost.
 *   • When the `value` prop changes from outside (e.g. reset / defaultValues) the
 *     component syncs with it, but only if it differs from the already-formatted string.
 */
const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, style, onChange, onFocus, onBlur, value, defaultValue, ...props }, ref) => {
  // Seed initial display from value / defaultValue props
  const seed = String(value ?? defaultValue ?? '')
  const [displayValue, setDisplayValue] = React.useState<string>(() => formatBRL(seed))

  // Sync when external `value` prop changes (e.g. form reset) — but only when the
  // incoming numeric/string value differs meaningfully from what we're already showing.
  const prevValueRef = React.useRef<string>(seed)
  React.useEffect(() => {
    const strVal = String(value ?? '')
    if (strVal === prevValueRef.current) return
    prevValueRef.current = strVal
    // Incoming numeric value from form store: format it for display
    const parsed = parseCurrency(strVal) || Number(strVal) || 0
    const formatted = parsed > 0 ? formatBRL(String(parsed).replace('.', ',')) : ''
    setDisplayValue(formatted)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBRL(e.target.value)
    setDisplayValue(formatted)
    // Mutate and forward so react-hook-form setValueAs receives the formatted string
    e.target.value = formatted
    onChange?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0' || e.target.value === '') {
      setDisplayValue('')
      e.target.value = ''
    } else {
      e.target.select()
    }
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // On blur, clean up trailing comma  e.g. "1.234," → "1.234"
    const cleaned = displayValue.replace(/,$/, '')
    setDisplayValue(cleaned)
    e.target.value = cleaned
    onBlur?.(e)
  }

  return (
    <div className="relative">
      {/* R$ prefix */}
      <span className="pointer-events-none select-none absolute left-4 top-1/2 -translate-y-1/2 z-10 leading-none text-[15px] font-medium text-muted-foreground/50">
        R$
      </span>

      <input
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{ paddingLeft: '2.75rem', ...style }}
        className={cn(
          'flex w-full rounded-2xl sm:rounded-xl border',
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
  )
})
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
