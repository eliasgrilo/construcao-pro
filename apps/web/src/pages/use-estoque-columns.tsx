import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, ArrowRightLeft, Minus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { MaterialNameCell, QuantityCell } from './estoque-parts'
import type { EstoqueItem } from './estoque-types'

interface UseEstoqueColumnsOptions {
  selectedObra: string | null
  canManageEstoque: boolean
  onBaixa: (item: EstoqueItem) => void
  onTransfer: (item: EstoqueItem) => void
  onDelete: (item: EstoqueItem) => void
  onDetail: (item: EstoqueItem) => void
}

export function useEstoqueColumns({
  selectedObra,
  canManageEstoque,
  onBaixa,
  onTransfer,
  onDelete,
  onDetail,
}: UseEstoqueColumnsOptions): ColumnDef<EstoqueItem>[] {
  return useMemo<ColumnDef<EstoqueItem>[]>(() => {
    const showObra = selectedObra === '__all__'

    const base: ColumnDef<EstoqueItem>[] = [
      {
        accessorKey: 'material.nome',
        header: 'Material',
        cell: ({ row }) => <MaterialNameCell item={row.original} onDetail={onDetail} />,
      },
      {
        accessorKey: 'material.categoria.nome',
        header: 'Categoria',
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.material?.categoria?.nome || '—'}</Badge>
        ),
      },
      {
        accessorKey: 'almoxarifado.nome',
        header: 'Almoxarifado',
        cell: ({ row }) => (
          <span className="text-[13px]">{row.original.almoxarifado?.nome || '—'}</span>
        ),
      },
    ]

    if (showObra) {
      base.push({
        accessorKey: 'almoxarifado.obra.nome',
        header: 'Obra',
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground">
            {row.original.almoxarifado?.obra?.nome || '—'}
          </span>
        ),
      })
    }

    base.push(
      {
        accessorKey: 'quantidade',
        header: 'Quantidade',
        cell: ({ row }) => <QuantityCell item={row.original} />,
      },
      {
        id: 'unidade',
        header: 'Unidade',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground uppercase">
            {row.original.material?.unidade ?? row.original.material?.categoria?.unidade ?? 'UN'}
          </span>
        ),
      },
      {
        id: 'custoUnitario',
        header: 'Custo Unitário',
        cell: ({ row }) => (
          <span className="tabular-nums text-[13px]">
            {formatCurrency(row.original.material?.preco_unitario ?? 0)}
          </span>
        ),
      },
      {
        id: 'valorTotal',
        header: 'Valor Total',
        cell: ({ row }) => {
          const total =
            (row.original.quantidade ?? 0) * (row.original.material?.preco_unitario ?? 0)
          return (
            <span className="font-semibold tabular-nums text-[13px]">{formatCurrency(total)}</span>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Última Atualização',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground tabular-nums whitespace-nowrap">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
    )

    if (canManageEstoque) {
      base.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-[12px] border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
              onClick={() => onBaixa(row.original)}
            >
              <Minus className="h-3 w-3 mr-1" />
              Baixa
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-muted-foreground hover:text-primary"
              title="Transferir"
              aria-label="Transferir entre almoxarifados"
              onClick={() => onTransfer(row.original)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
              title="Remover do estoque"
              aria-label="Remover do estoque"
              onClick={() => onDelete(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      })
    }

    return base
  }, [selectedObra, canManageEstoque, onBaixa, onTransfer, onDelete, onDetail])
}
