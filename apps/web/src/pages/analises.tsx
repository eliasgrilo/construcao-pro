import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Building2, Package, TrendingUp, Users } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { FornecedoresTab } from './analises/fornecedores-tab'
import { MateriaisTab } from './analises/materiais-tab'
import { OrcamentoTab } from './analises/orcamento-tab'
import { TendenciaTab } from './analises/tendencia-tab'

// ─── Section registry ─────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'orcamento', label: 'Orçamento', icon: Building2 },
  { key: 'tendencia', label: 'Tendência', icon: TrendingUp },
  { key: 'fornecedores', label: 'Fornecedores', icon: Users },
  { key: 'materiais', label: 'Materiais', icon: Package },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

// ─── SectionDivider ───────────────────────────────────────────────────────────

function SectionDivider({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 md:px-6 pt-8 pb-4">
      <div
        className="flex items-center justify-center w-8 h-8 rounded-[10px] flex-shrink-0"
        style={{ backgroundColor: 'rgba(0,122,255,0.1)', color: '#007AFF' }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 whitespace-nowrap">
        {label}
      </p>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  )
}

// ─── AnalisesPage ─────────────────────────────────────────────────────────────

export function AnalisesPage() {
  const layoutId = useId()
  const [activeSection, setActiveSection] = useState<SectionKey>('orcamento')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<SectionKey, HTMLElement | null>>({
    orcamento: null,
    tendencia: null,
    fornecedores: null,
    materiais: null,
  })

  // ── IntersectionObserver drives the sticky nav highlight ──
  useEffect(() => {
    const container = scrollContainerRef.current
    const observers: IntersectionObserver[] = []

    for (const { key } of SECTIONS) {
      const el = sectionRefs.current[key]
      if (!el) continue

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(key)
        },
        {
          root: container,
          rootMargin: '-15% 0px -65% 0px',
          threshold: 0,
        },
      )
      obs.observe(el)
      observers.push(obs)
    }

    return () => {
      for (const o of observers) o.disconnect()
    }
  }, [])

  function scrollToSection(key: SectionKey) {
    const el = sectionRefs.current[key]
    const container = scrollContainerRef.current
    if (!el || !container) return
    // iOS Safari breaks with scrollIntoView on position:fixed containers.
    // Manual scrollTop arithmetic is the only reliable cross-platform approach.
    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top)
    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
    setActiveSection(key)
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 py-5 border-b border-border/8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Análises</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Insights de orçamento, preços e tendências de custo
            </p>
          </div>

          {/* Live indicator */}
          <div
            className="flex items-center gap-2 px-3 h-8 rounded-full border flex-shrink-0"
            style={{
              backgroundColor: 'rgba(52,199,89,0.08)',
              borderColor: 'rgba(52,199,89,0.2)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: '#34C759' }}
            />
            <span className="text-[12px] font-semibold" style={{ color: '#34C759' }}>
              Ao vivo
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Sticky section navigator ──────────────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 md:px-6 py-2.5 border-b border-border/8 bg-background/90 backdrop-blur-xl">
        <nav
          aria-label="Navegação de seções"
          className="flex items-center gap-0.5 overflow-x-auto scrollbar-none"
        >
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => scrollToSection(key)}
              aria-current={activeSection === key ? 'true' : undefined}
              className={cn(
                'relative flex items-center gap-2 px-3.5 h-9 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0',
                activeSection === key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {activeSection === key && (
                <motion.div
                  layoutId={`${layoutId}-pill`}
                  className="absolute inset-0 rounded-xl bg-muted shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <Icon className="h-3.5 w-3.5 relative z-[1]" />
              <span className="relative z-[1]">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Single-page scrollable content ───────────────────────────────── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {/* Orçamento */}
        <section
          ref={(el) => {
            sectionRefs.current.orcamento = el
          }}
          id="section-orcamento"
          aria-label="Orçamento por obra"
        >
          <SectionDivider icon={Building2} label="Orçamento" />
          <OrcamentoTab />
        </section>

        {/* Tendência */}
        <section
          ref={(el) => {
            sectionRefs.current.tendencia = el
          }}
          id="section-tendencia"
          aria-label="Tendência de custos"
        >
          <SectionDivider icon={TrendingUp} label="Tendência de Custos" />
          <TendenciaTab isActive={true} />
        </section>

        {/* Fornecedores */}
        <section
          ref={(el) => {
            sectionRefs.current.fornecedores = el
          }}
          id="section-fornecedores"
          aria-label="Análise de fornecedores"
        >
          <SectionDivider icon={Users} label="Fornecedores" />
          <FornecedoresTab isActive={true} />
        </section>

        {/* Materiais */}
        <section
          ref={(el) => {
            sectionRefs.current.materiais = el
          }}
          id="section-materiais"
          aria-label="Análise de materiais"
        >
          <SectionDivider icon={Package} label="Materiais" />
          <MateriaisTab isActive={true} />
        </section>

        {/* Bottom breathing room */}
        <div className="h-16" />
      </div>
    </div>
  )
}
