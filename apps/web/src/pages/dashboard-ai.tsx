import type { DashAIMessage } from '@/hooks/use-dashboard-ai'
/**
 * dashboard-ai.tsx
 * UI components for the AI chat panel.
 * Hook and logic: @/hooks/use-dashboard-ai
 */
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ChevronRight, Send, Sparkles, X } from 'lucide-react'
import { type RefObject, memo, useEffect, useRef } from 'react'

export type { DashAIBaseContext, DashAIMessage } from '@/hooks/use-dashboard-ai'
export { useDashboardAI } from '@/hooks/use-dashboard-ai'

// Memoized: typing animation rerenders at 60fps — memo prevents parent state changes
// (checklist open, task text) from triggering unnecessary re-renders of this indicator.
const DashAITypingIndicator = memo(function DashAITypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-60"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
})

function DashMarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        const key = `dm-${i}-${part.slice(0, 8)}`
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={key}>{part.slice(2, -2)}</strong>
        }
        return <span key={key}>{part}</span>
      })}
    </>
  )
}

export interface DashAIChatPanelProps {
  open: boolean
  closeChat: () => void
  messages: DashAIMessage[]
  input: string
  setInput: (v: string) => void
  isProcessing: boolean
  handleUserMessage: (text: string) => void
  messagesEndRef: RefObject<HTMLDivElement>
  suggestions: string[]
}

export function DashAIChatPanel({
  open,
  closeChat,
  messages,
  input,
  setInput,
  isProcessing,
  handleUserMessage,
  messagesEndRef,
  suggestions,
}: DashAIChatPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={closeChat}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] z-50 flex flex-col"
            style={{
              background: 'var(--background)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.12)',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(0,122,255,0.08) 0%, rgba(52,199,89,0.05) 100%)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #007AFF, #34C759)',
                    boxShadow: '0 2px 10px rgba(0,122,255,0.30)',
                  }}
                >
                  <Bot style={{ height: 18, width: 18, color: '#fff' }} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold leading-none">Assistente IA</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: '#34C759' }}
                    />
                    Análise do painel em tempo real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeChat}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:bg-muted/80 transition-colors touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Fechar assistente"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-3xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(0,122,255,0.12), rgba(52,199,89,0.12))',
                    }}
                  >
                    <Sparkles className="h-7 w-7" style={{ color: '#007AFF' }} />
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold mb-1">Painel Inteligente</p>
                    <p className="text-[13px] text-muted-foreground">
                      Faça perguntas sobre seu negócio
                    </p>
                  </div>
                  <div className="w-full space-y-2">
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleUserMessage(q)}
                        className="w-full text-left px-4 py-3 rounded-xl border border-border/60 text-[13px] hover:bg-accent/60 transition-colors flex items-center justify-between group"
                      >
                        <span>{q}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'flex',
                          msg.role === 'user' ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[88%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed',
                            msg.role === 'user'
                              ? 'text-white rounded-br-md'
                              : 'rounded-bl-md border border-border/40',
                          )}
                          style={
                            msg.role === 'user'
                              ? { background: '#007AFF' }
                              : { background: 'var(--muted)', color: 'var(--foreground)' }
                          }
                        >
                          {msg.isTyping ? (
                            <DashAITypingIndicator />
                          ) : (
                            <div className="whitespace-pre-wrap">
                              <DashMarkdownText text={msg.content} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/60">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleUserMessage(input)
                    }
                  }}
                  placeholder="Pergunte sobre seu negócio..."
                  disabled={isProcessing}
                  className="flex-1 h-11 px-4 rounded-xl border border-border/60 bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]/60 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => handleUserMessage(input)}
                  disabled={!input.trim() || isProcessing}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #007AFF, #34C759)',
                    boxShadow: input.trim() ? '0 2px 10px rgba(0,122,255,0.30)' : 'none',
                  }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/50 mt-2 text-center">
                Powered by Gemini AI · Dados do painel em tempo real
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
