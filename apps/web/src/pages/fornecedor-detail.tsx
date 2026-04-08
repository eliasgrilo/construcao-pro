import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { usePermissions } from '@/hooks/use-permissions'
import {
  type FornecedorRow,
  type MovimentacaoRow as MovRow,
  useDeleteFornecedor,
  useFornecedorMovimentacoes,
  useFornecedores,
} from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { useNavigate, useParams } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Check, ChevronLeft, Copy, Mail, MapPin, Phone, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { HistoricoFornecedor } from './fornecedor-detail-historico'
import { EditFornecedorModal } from './fornecedor-detail-modal'
import { FornecedorDetailStatsSection } from './fornecedor-detail-stats'
import {
  clr,
  formatMonthLabel,
  getFornecedorAvatarColor,
  getFornecedorInitials,
  getMonthKey,
} from './fornecedor-utils'

/* ═══════════════════════════════════════════════════════════
   MovimentacaoRow — clean three-line layout
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   QuickActionBtn — Apple Contacts-style circular action
   ═══════════════════════════════════════════════════════════ */

function QuickActionBtn({
  icon: Icon,
  label,
  color,
  onPress,
}: {
  icon: React.ElementType
  label: string
  color: string
  onPress: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onPress}
      className="flex flex-col items-center gap-[6px] flex-1"
    >
      <div
        className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px]"
        style={{ backgroundColor: `${color}14` }}
      >
        <Icon className="h-[22px] w-[22px]" style={{ color }} strokeWidth={1.75} />
      </div>
      <span className="text-[11.5px] font-medium tracking-tight" style={{ color }}>
        {label}
      </span>
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export function FornecedorDetailPage() {
  const { fornecedorId } = useParams({ strict: false }) as { fornecedorId: string }
  const navigate = useNavigate()
  const { toast } = useToast()
  const { canManageFornecedores } = usePermissions()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(false)
  const [cnpjCopied, setCnpjCopied] = useState(false)

  const { data: fornecedores = [], isLoading: isLoadingForn } = useFornecedores()
  const { data: movimentacoes = [], isLoading: isLoadingMovs } =
    useFornecedorMovimentacoes(fornecedorId)
  const deleteMutation = useDeleteFornecedor()

  const fornecedor = useMemo(
    () => fornecedores.find((f: FornecedorRow) => f.id === fornecedorId) ?? null,
    [fornecedores, fornecedorId],
  )

  /* ── Stats ── */
  const stats = useMemo(() => {
    const entradas = movimentacoes.filter((m: MovRow) => m.tipo === 'ENTRADA')
    const totalGasto = entradas.reduce(
      (sum: number, m: MovRow) => sum + (m.quantidade ?? 0) * (m.preco_unitario ?? 0),
      0,
    )
    const numMateriais = new Set(entradas.map((m: MovRow) => m.material?.id).filter(Boolean)).size
    const lastMov = movimentacoes[0] ?? null
    const ticketMedio = entradas.length > 0 ? totalGasto / entradas.length : 0
    return {
      totalGasto,
      numCompras: entradas.length,
      numMateriais,
      lastDate: lastMov?.created_at ?? null,
      ticketMedio,
    }
  }, [movimentacoes])

  /* ── Top materials by spend ── */
  const topMateriais = useMemo(() => {
    const map = new Map<
      string,
      { id: string; nome: string; codigo?: string | null; total: number; count: number }
    >()
    for (const m of movimentacoes) {
      if (m.tipo !== 'ENTRADA') continue
      const mat = m.material
      if (!mat?.id) continue
      const spend = (m.quantidade ?? 0) * (m.preco_unitario ?? 0)
      const existing = map.get(mat.id)
      if (existing) {
        existing.total += spend
        existing.count++
      } else {
        map.set(mat.id, { id: mat.id, nome: mat.nome, codigo: mat.codigo, total: spend, count: 1 })
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [movimentacoes])

  /* ── Material categories with counts ── */
  const categorias = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; count: number }>()
    for (const m of movimentacoes) {
      const cat = m.material?.categoria
      if (cat?.id) {
        const existing = map.get(cat.id)
        if (existing) {
          existing.count++
        } else {
          map.set(cat.id, { id: cat.id, nome: cat.nome, count: 1 })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [movimentacoes])

  const handleCopyCNPJ = async () => {
    if (!fornecedor?.cnpj) return
    try {
      await navigator.clipboard.writeText(fornecedor.cnpj)
      setCnpjCopied(true)
      setTimeout(() => setCnpjCopied(false), 2000)
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'error' })
    }
  }

  const handleDelete = () => {
    deleteMutation.mutate(fornecedorId, {
      onSuccess: () => {
        setDeleteTarget(false)
        toast({ title: 'Fornecedor excluído', variant: 'success' })
        navigate({ to: '/fornecedores' })
      },
      onError: () =>
        toast({
          title: 'Erro ao excluir',
          description: 'Este fornecedor pode estar vinculado a movimentações.',
          variant: 'error',
        }),
    })
  }

  /* ── Not found ── */
  if (isLoadingForn) {
    return (
      <div className="flex flex-col gap-6 p-6 sm:p-8 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 bg-muted rounded-[20px]" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-1/3 bg-muted rounded" />
            <div className="h-4 w-1/4 bg-muted rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!fornecedor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-bold">Fornecedor não encontrado</h2>
        <button
          type="button"
          onClick={() => navigate({ to: '/fornecedores' })}
          className="mt-4 text-sm text-[#007AFF]"
        >
          Voltar para Fornecedores
        </button>
      </div>
    )
  }

  const color = fornecedor ? getFornecedorAvatarColor(fornecedor.nome) : clr.blue
  const initials = fornecedor ? getFornecedorInitials(fornecedor.nome) : '…'
  const hasContact =
    fornecedor &&
    (fornecedor.cnpj ||
      fornecedor.telefone ||
      fornecedor.email ||
      fornecedor.endereco ||
      fornecedor.observacao)
  const hasQuickActions = fornecedor && (fornecedor.telefone || fornecedor.email || fornecedor.cnpj)

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="pb-20 min-h-screen"
    >
      {/* ════════════════════════════════════════════════════
          iOS Navigation bar
          ════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 pt-4 pb-3 bg-background/80 backdrop-blur-xl border-b border-border/10">
        <button
          type="button"
          onClick={() => navigate({ to: '/fornecedores' })}
          className="flex items-center gap-0.5 text-[#007AFF] text-[16px] font-normal -ml-1"
        >
          <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2.5} />
          <span className="hidden sm:inline">Fornecedores</span>
        </button>
        <div className="flex items-center gap-3">
          {fornecedor && canManageFornecedores && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="text-[15px] font-medium text-[#007AFF]"
            >
              Editar
            </button>
          )}
          {fornecedor && canManageFornecedores && (
            <button
              type="button"
              onClick={() => setDeleteTarget(true)}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-[#FF3B30]/[0.08] dark:bg-[#FF3B30]/[0.12] active:bg-[#FF3B30]/[0.16] transition-colors"
            >
              <Trash2 className="h-[15px] w-[15px] text-[#FF3B30]" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          Hero — avatar · name · status · quick actions
          ════════════════════════════════════════════════════ */}
      {fornecedor ? (
        <div className="relative px-4 md:px-8 pt-7 pb-2">
          {/* Subtle color wash behind hero */}
          <div
            className="absolute inset-x-0 top-0 h-40 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, ${color}0D 0%, transparent 100%)`,
            }}
          />

          {/* Avatar + name + status */}
          <div className="relative flex items-end gap-4">
            <div className="relative flex-shrink-0">
              <div
                className="flex h-[82px] w-[82px] items-center justify-center rounded-[22px]"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 12px 28px ${color}30, 0 4px 10px ${color}20`,
                }}
              >
                <span className="text-[30px] font-bold text-white leading-none tracking-tight select-none">
                  {initials}
                </span>
              </div>
              {/* Status dot */}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-[15px] w-[15px] rounded-full border-[2.5px] border-background"
                style={{ backgroundColor: fornecedor.ativo !== false ? clr.green : clr.gray }}
              />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-[22px] font-bold tracking-tight leading-tight truncate">
                {fornecedor.nome}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-[3.5px] text-[11.5px] font-semibold"
                  style={{
                    backgroundColor:
                      fornecedor.ativo !== false ? `${clr.green}15` : `${clr.gray}15`,
                    color: fornecedor.ativo !== false ? clr.green : clr.gray,
                  }}
                >
                  {fornecedor.ativo !== false ? 'Ativo' : 'Inativo'}
                </span>
                {movimentacoes.length > 0 && (
                  <span className="text-[11.5px] text-muted-foreground/35">
                    {movimentacoes.length}{' '}
                    {movimentacoes.length === 1 ? 'lançamento' : 'lançamentos'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          {hasQuickActions && (
            <div className="relative mt-5 flex items-start gap-2">
              {fornecedor.telefone && (
                <QuickActionBtn
                  icon={Phone}
                  label="Ligar"
                  color={clr.green}
                  onPress={() => {
                    window.location.href = `tel:${fornecedor.telefone}`
                  }}
                />
              )}
              {fornecedor.email && (
                <QuickActionBtn
                  icon={Mail}
                  label="Email"
                  color={clr.blue}
                  onPress={() => {
                    window.location.href = `mailto:${fornecedor.email}`
                  }}
                />
              )}
              {fornecedor.cnpj && (
                <QuickActionBtn
                  icon={cnpjCopied ? Check : Copy}
                  label={cnpjCopied ? 'Copiado!' : 'CNPJ'}
                  color={cnpjCopied ? clr.green : clr.gray}
                  onPress={handleCopyCNPJ}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        /* Skeleton hero */
        <div className="px-4 md:px-8 pt-7 pb-2 animate-pulse">
          <div className="flex items-end gap-4">
            <div className="h-[82px] w-[82px] rounded-[22px] bg-muted/20 flex-shrink-0" />
            <div className="flex-1 space-y-2 pb-1">
              <div className="h-[20px] w-3/5 rounded-full bg-muted/20" />
              <div className="h-[14px] w-1/4 rounded-full bg-muted/15" />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          Contact info card
          ════════════════════════════════════════════════════ */}
      {hasContact && (
        <div className="px-4 md:px-8 mt-4">
          <div className="rounded-2xl bg-white dark:bg-white/[0.05] border border-border/10 dark:border-white/[0.06] overflow-hidden divide-y divide-border/8 dark:divide-white/[0.05]">
            {fornecedor.cnpj && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted/[0.06] flex-shrink-0">
                  <Building2
                    className="h-[14px] w-[14px] text-muted-foreground/40"
                    strokeWidth={1.8}
                  />
                </div>
                <span className="flex-1 text-[14px] font-mono text-foreground/80 truncate">
                  {fornecedor.cnpj}
                </span>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={handleCopyCNPJ}
                  className="flex-shrink-0 flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: cnpjCopied ? `${clr.green}12` : `${clr.blue}0E`,
                    color: cnpjCopied ? clr.green : clr.blue,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {cnpjCopied ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-[12px] w-[12px]" strokeWidth={2.5} />
                        Copiado
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-[12px] w-[12px]" strokeWidth={2} />
                        Copiar
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            )}

            {fornecedor.telefone && (
              <a
                href={`tel:${fornecedor.telefone}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-muted/[0.04] transition-colors"
              >
                <div
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${clr.green}12` }}
                >
                  <Phone
                    className="h-[14px] w-[14px] flex-shrink-0"
                    style={{ color: clr.green }}
                    strokeWidth={1.8}
                  />
                </div>
                <span className="flex-1 text-[14px] text-foreground/80">{fornecedor.telefone}</span>
                <span className="text-[12px] font-medium" style={{ color: clr.green }}>
                  Ligar
                </span>
              </a>
            )}

            {fornecedor.email && (
              <a
                href={`mailto:${fornecedor.email}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-muted/[0.04] transition-colors"
              >
                <div
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${clr.blue}10` }}
                >
                  <Mail
                    className="h-[14px] w-[14px] flex-shrink-0"
                    style={{ color: clr.blue }}
                    strokeWidth={1.8}
                  />
                </div>
                <span className="flex-1 text-[14px] text-foreground/80 truncate">
                  {fornecedor.email}
                </span>
                <span className="text-[12px] font-medium" style={{ color: clr.blue }}>
                  Email
                </span>
              </a>
            )}

            {fornecedor.endereco && (
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted/[0.06] flex-shrink-0">
                  <MapPin
                    className="h-[14px] w-[14px] text-muted-foreground/40"
                    strokeWidth={1.8}
                  />
                </div>
                <span className="flex-1 text-[14px] text-foreground/70 leading-snug">
                  {fornecedor.endereco}
                </span>
              </div>
            )}

            {fornecedor.observacao && (
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-[12px] font-semibold text-muted-foreground/35 uppercase tracking-wide mt-[3px] flex-shrink-0 w-[30px] text-center">
                  Obs
                </span>
                <span className="flex-1 text-[13.5px] text-muted-foreground/55 leading-relaxed">
                  {fornecedor.observacao}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <FornecedorDetailStatsSection
        isLoadingMovs={isLoadingMovs}
        stats={stats}
        topMateriais={topMateriais}
        color={color}
      />

      <HistoricoFornecedor movimentacoes={movimentacoes} isLoadingMovs={isLoadingMovs} />

      {/* ════════════════════════════════════════════════════
          Edit modal
          ════════════════════════════════════════════════════ */}
      {fornecedor && (
        <EditFornecedorModal open={editOpen} onOpenChange={setEditOpen} fornecedor={fornecedor} />
      )}

      {/* ════════════════════════════════════════════════════
          Delete ActionSheet — iOS-native pattern
          ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black"
              onClick={() => !deleteMutation.isPending && setDeleteTarget(false)}
            />
            <motion.div
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              exit={{ y: '110%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340, mass: 0.85 }}
              className="fixed bottom-0 left-0 right-0 z-[310] px-3 select-none"
              style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
            >
              <div className="rounded-[16px] overflow-hidden bg-[#F2F2F7]/[0.97] dark:bg-[#2C2C2E]/[0.97] backdrop-blur-3xl mb-[10px]">
                <div className="px-5 pt-[14px] pb-[13px] text-center border-b border-black/[0.06] dark:border-white/[0.06]">
                  <p className="text-[13px] font-semibold text-foreground/70">
                    Excluir fornecedor?
                  </p>
                  <p className="text-[13px] font-medium text-foreground/80 mt-[2px] truncate">
                    {fornecedor?.nome}
                  </p>
                  <p className="text-[11px] text-muted-foreground/40 mt-1">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="w-full flex items-center gap-[18px] px-5 text-[#FF3B30] text-[17px] active:bg-[#FF3B30]/[0.05] disabled:opacity-50 transition-opacity"
                  style={{ minHeight: 57 }}
                >
                  <Trash2 className="h-[22px] w-[22px] flex-shrink-0" strokeWidth={1.55} />
                  {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(false)}
                disabled={deleteMutation.isPending}
                className="w-full rounded-[16px] bg-[#F2F2F7]/[0.97] dark:bg-[#2C2C2E]/[0.97] backdrop-blur-3xl text-[17px] font-bold text-[#007AFF] active:bg-black/[0.06] dark:active:bg-white/[0.06] disabled:opacity-50 transition-opacity"
                style={{ minHeight: 57 }}
              >
                Cancelar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
