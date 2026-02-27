import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { useMovimentacoes } from '@/hooks/use-supabase'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight } from 'lucide-react'

import { useEffect, useState } from 'react'

const tipoConfig: Record<
  string,
  {
    label: string
    badge: 'success' | 'destructive' | 'info'
    icon: typeof ArrowLeftRight
    tint: string
  }
> = {
  ENTRADA: { label: 'Entrada', badge: 'success', icon: ArrowDownRight, tint: '#34C759' },
  SAIDA: { label: 'Saída', badge: 'destructive', icon: ArrowUpRight, tint: '#FF3B30' },
  TRANSFERENCIA: { label: 'Transferência', badge: 'info', icon: ArrowLeftRight, tint: '#007AFF' },
}

const statusAprovacao: Record<
  string,
  { label: string; variant: 'success' | 'destructive' | 'warning' }
> = {
  APROVADA: { label: 'Aprovada', variant: 'success' },
  REJEITADA: { label: 'Rejeitada', variant: 'destructive' },
  PENDENTE: { label: 'Pendente', variant: 'warning' },
}

/* ─── Extract LocalStorage Financial Movements ─── */
function getGlobalFinancialMovs() {
  try {
    const contas = JSON.parse(localStorage.getItem('financeiro_contas_v1') || '[]')
    let allMovs: any[] = []
    for (const c of contas) {
      const movs = JSON.parse(localStorage.getItem(`financeiro_mov_${c.id}`) || '[]')
      const mapped = movs.map((m: any) => ({
        id: m.id,
        tipo: m.tipo,
        material: { nome: m.motivo, codigo: 'FINANCEIRO' },
        quantidade: 1,
        preco_unitario: m.valor,
        almoxarifado: {
          nome: `Banco: ${c.banco}`,
          obra: { nome: m.subconta === 'CAIXA' ? 'Caixa Principal' : 'Aplicado' },
        },
        updated_at: m.createdAt,
        created_at:
          m.createdAt || (m.data ? new Date(m.data).toISOString() : new Date().toISOString()),
        isFinancial: true,
      }))
      allMovs = [...allMovs, ...mapped]
    }
    return allMovs
  } catch {
    return []
  }
}

export function MovimentacoesPage() {
  const { data: movsData, isLoading } = useMovimentacoes()
  const [unifiedData, setUnifiedData] = useState<any[]>([])

  useEffect(() => {
    if (!isLoading) {
      const localMovs = getGlobalFinancialMovs()
      const sbData = movsData || []
      const combined = [...sbData, ...localMovs].sort((a, b) => {
        const dA = new Date(a.created_at).getTime()
        const dB = new Date(b.created_at).getTime()
        return dB - dA
      })
      setUnifiedData(combined)
    }
  }, [movsData, isLoading])

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => {
        const cfg = tipoConfig[row.original.tipo] || tipoConfig.ENTRADA
        const Icon = cfg.icon
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" style={{ color: cfg.tint }} />
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'material.nome',
      header: 'Material',
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-[13px]">{row.original.material?.nome || '—'}</span>
          <p className="text-[11px] text-muted-foreground font-mono">
            {row.original.material?.codigo || ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'quantidade',
      header: 'Quantidade',
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums text-[13px]">
          {formatNumber(row.original.quantidade)}
        </span>
      ),
    },
    {
      accessorKey: 'preco_unitario',
      header: 'Valor Un.',
      cell: ({ row }) => {
        const p = row.original.preco_unitario
        return p ? (
          <span className="text-[13px] tabular-nums">{formatCurrency(p)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => {
        const p = row.original.preco_unitario ?? 0
        const q = row.original.quantidade ?? 0
        const total = p * q
        if (total <= 0) return <span className="text-muted-foreground">—</span>
        const cfg = tipoConfig[row.original.tipo] || tipoConfig.ENTRADA
        return (
          <span
            className={`text-[13px] font-semibold tabular-nums ${row.original.tipo === 'SAIDA' ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}
          >
            {row.original.tipo === 'SAIDA' ? '−' : '+'}
            {formatCurrency(total)}
          </span>
        )
      },
    },
    {
      accessorKey: 'almoxarifado.nome',
      header: 'Almoxarifado',
      cell: ({ row }) => (
        <div>
          <span className="text-[13px]">{row.original.almoxarifado?.nome || '—'}</span>
          <p className="text-[11px] text-muted-foreground">
            {row.original.almoxarifado?.obra?.nome || ''}
          </p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const st = row.original.status_transferencia
        if (!st) return <span className="text-muted-foreground">—</span>
        const cfg = statusAprovacao[st] || statusAprovacao.PENDENTE
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      accessorKey: 'fornecedor.nome',
      header: 'Fornecedor',
      cell: ({ row }) => {
        const f = row.original.fornecedor
        return f ? (
          <div>
            <span className="text-[13px]">{f.nome}</span>
            {f.cnpj && <p className="text-[11px] text-muted-foreground font-mono">{f.cnpj}</p>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'forma_pagamento',
      header: 'Pagamento',
      cell: ({ row }) => {
        const fp = row.original.forma_pagamento
        if (!fp) return <span className="text-muted-foreground">—</span>
        const labels: Record<string, string> = {
          PIX: 'PIX',
          CARTAO_CREDITO: 'Cartão Créd.',
          CARTAO_DEBITO: 'Cartão Déb.',
          BOLETO: 'Boleto',
          TRANSFERENCIA: 'Transf.',
          DINHEIRO: 'Dinheiro',
          CHEQUE: 'Cheque',
        }
        return <span className="text-[13px]">{labels[fp] || fp}</span>
      },
    },
    {
      accessorKey: 'usuario.nome',
      header: 'Usuário',
      cell: ({ row }) => (
        <span className="text-[13px] text-muted-foreground">
          {row.original.usuario?.nome || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Data',
      cell: ({ row }) => (
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
  ]

  return (
    <div className="pb-10">
      <div className="px-4 md:px-8 pt-10 pb-6">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Movimentações</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Histórico de entradas, saídas e transferências
        </p>
      </div>

      {/* Instruction banner */}
      <div className="px-4 md:px-8 mb-5">
        <div className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-4 py-3 text-[13px] text-muted-foreground">
          <span>📦</span>
          <span>
            As movimentações são registradas automaticamente. Para dar{' '}
            <strong>entrada de material</strong>, vá para <strong>Estoque → Nova Entrada</strong>.
          </span>
        </div>
      </div>

      <div className="px-4 md:px-8">
        <DataTable
          columns={columns}
          data={unifiedData}
          isLoading={isLoading}
          searchPlaceholder="Buscar movimentações..."
        />
      </div>
    </div>
  )
}
