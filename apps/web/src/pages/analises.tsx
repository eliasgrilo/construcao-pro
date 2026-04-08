import { cn } from '@/lib/utils'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { FornecedoresTab } from './analises/fornecedores-tab'
import { MateriaisTab } from './analises/materiais-tab'
import { OrcamentoTab } from './analises/orcamento-tab'
import { TendenciaTab } from './analises/tendencia-tab'

const TABS = [
  { key: 'orcamento', label: 'Orçamento' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'tendencia', label: 'Tendência' },
  { key: 'materiais', label: 'Materiais' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function AnalisesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('orcamento')

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-4 md:px-6 py-5 border-b border-border/8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Análises</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Insights de orçamento, preços e tendências de custo
          </p>
        </motion.div>
      </div>

      <TabsPrimitive.Root
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabKey)}
      >
        <div className="px-4 md:px-6 pt-4 pb-2 border-b border-border/8">
          <TabsPrimitive.List
            aria-label="Seções de análise"
            className="inline-flex items-center bg-muted rounded-[12px] p-1 gap-0.5"
          >
            {TABS.map((tab) => (
              <TabsPrimitive.Trigger
                key={tab.key}
                value={tab.key}
                className={cn(
                  'relative px-4 h-9 rounded-[9px] text-[13px] font-medium whitespace-nowrap transition-colors',
                  'data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                )}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="analises-tab-pill"
                    className="absolute inset-0 rounded-[9px] bg-background shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* AnimatePresence garante fade suave tanto na entrada quanto na saída do conteúdo.
              mode="wait" espera o conteúdo antigo sair antes de mostrar o novo —
              evita flicker de dois painéis sobrepostos. */}
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === 'orcamento' && (
              <TabsPrimitive.Content
                key="orcamento"
                value="orcamento"
                forceMount
                className="pt-5 focus-visible:outline-none"
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ willChange: 'opacity, transform' }}
                >
                  <OrcamentoTab />
                </motion.div>
              </TabsPrimitive.Content>
            )}
            {activeTab === 'fornecedores' && (
              <TabsPrimitive.Content
                key="fornecedores"
                value="fornecedores"
                forceMount
                className="pt-5 focus-visible:outline-none"
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ willChange: 'opacity, transform' }}
                >
                  <FornecedoresTab isActive={activeTab === 'fornecedores'} />
                </motion.div>
              </TabsPrimitive.Content>
            )}
            {activeTab === 'tendencia' && (
              <TabsPrimitive.Content
                key="tendencia"
                value="tendencia"
                forceMount
                className="pt-5 focus-visible:outline-none"
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ willChange: 'opacity, transform' }}
                >
                  <TendenciaTab isActive={activeTab === 'tendencia'} />
                </motion.div>
              </TabsPrimitive.Content>
            )}
            {activeTab === 'materiais' && (
              <TabsPrimitive.Content
                key="materiais"
                value="materiais"
                forceMount
                className="pt-5 focus-visible:outline-none"
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ willChange: 'opacity, transform' }}
                >
                  <MateriaisTab isActive={activeTab === 'materiais'} />
                </motion.div>
              </TabsPrimitive.Content>
            )}
          </AnimatePresence>
        </div>
      </TabsPrimitive.Root>
    </div>
  )
}
