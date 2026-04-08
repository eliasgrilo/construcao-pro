/**
 * obra-detail-tab-bar.tsx
 * Tab strip extracted from obra-detail.tsx
 */
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useId } from 'react'
import { ArrowLeftRight, DollarSign, FileText, Package, Warehouse, Wrench } from 'lucide-react'
import type { Tab } from './obra-detail-types'

export const tabs: { key: Tab; label: string; icon: typeof Warehouse }[] = [
  { key: 'custos', label: 'Custos', icon: DollarSign },
  { key: 'almoxarifados', label: 'Construção', icon: Warehouse },
  { key: 'burocracia', label: 'Burocracia', icon: FileText },
  { key: 'estoque', label: 'Estoque', icon: Package },
  { key: 'movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
  { key: 'manutencao', label: 'Manutenção', icon: Wrench },
]

export function ObraDetailTabBar({
  activeTab,
  setActiveTab,
  obraId,
}: {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  obraId: string
}) {
  const layoutIdPrefix = useId()

  return (
    <div
      className="px-4 md:px-8 mt-2"
      style={{ borderBottom: '0.5px solid rgba(120,120,128,0.22)' }}
    >
      <div className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key)
              try {
                sessionStorage.setItem(`obra-tab-${obraId}`, tab.key)
              } catch {
                // sessionStorage may be unavailable (private browsing / quota exceeded)
              }
            }}
            className={cn(
              'relative flex items-center gap-1.5 px-3 md:px-4 py-3.5 text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors duration-200',
              activeTab === tab.key
                ? 'text-foreground'
                : 'text-muted-foreground/60 hover:text-muted-foreground',
            )}
            style={{ letterSpacing: '-0.005em' }}
          >
            <tab.icon className="h-[15px] w-[15px]" />
            {tab.label}
            {activeTab === tab.key && (
              <motion.span
                layoutId={`${layoutIdPrefix}-tab-indicator`}
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-primary"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
