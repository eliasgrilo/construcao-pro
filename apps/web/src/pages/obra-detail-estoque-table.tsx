import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRightLeft, Filter, Minus, Package, Plus, Trash2 } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { ESTOQUE_CATEGORY_ALL } from './obra-detail-estoque-utils'
import { Empty } from './obra-detail-parts'
import { getUnidadeForEstoque, isLowStock } from './obra-detail-state'
import type { BaixaTarget, DeleteEstoqueTarget, EstoqueItem } from './obra-detail-types'

interface ObraDetailEstoqueTableProps {
  estoque: EstoqueItem[]
  isLoading?: boolean
  canManageEstoque: boolean
  onOpenEntrada: () => void
  onOpenBaixa: (target: BaixaTarget) => void
  onOpenTransfer: (item: EstoqueItem) => void
  onOpenDelete: (target: DeleteEstoqueTarget) => void
}

export function ObraDetailEstoqueTable({
  estoque,
  isLoading = false,
  canManageEstoque,
  onOpenEntrada,
  onOpenBaixa,
  onOpenTransfer,
  onOpenDelete,
}: ObraDetailEstoqueTableProps) {
  const layoutIdPrefix = useId()
  const [filterCategoria, setFilterCategoria] = useState(ESTOQUE_CATEGORY_ALL)

  const lowCount = estoque.filter((item) => isLowStock(item)).length

  const categorias = useMemo(() => {
    const counts = new Map<string, number>()

    for (const item of estoque) {
      const categoria = item.material?.categoria?.nome ?? 'Sem Categoria'
      counts.set(categoria, (counts.get(categoria) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([nome, count]) => ({ key: nome, label: nome, count }))
  }, [estoque])

  const filteredEstoque = useMemo(() => {
    if (filterCategoria === ESTOQUE_CATEGORY_ALL) return estoque

    return estoque.filter(
      (item) => (item.material?.categoria?.nome ?? 'Sem Categoria') === filterCategoria,
    )
  }, [estoque, filterCategoria])

  const columns = useMemo<ColumnDef<EstoqueItem>[]>(
    () => [
      {
        accessorKey: 'material.nome',
        header: 'Material',
        cell: ({ row }) => (
          <div className="max-w-[280px]">
            <span
              className="font-medium text-[13px] block line-clamp-2 break-words"
              title={row.original.material?.nome || '—'}
            >
              {row.original.material?.nome || '—'}
            </span>
            {row.original.material?.codigo && (
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {row.original.material.codigo}
              </p>
            )}
          </div>
        ),
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
      {
        accessorKey: 'quantidade',
        header: 'Quantidade',
        cell: ({ row }) => {
          const quantity = row.original.quantidade ?? 0
          const low = isLowStock(row.original)
          return (
            <div className="flex items-center gap-1.5">
              <span
                className={cn('font-semibold tabular-nums text-[13px]', low && 'text-destructive')}
              >
                {formatNumber(quantity)}
              </span>
              {low && <AlertTriangle className="h-3 w-3 text-warning" />}
            </div>
          )
        },
      },
      {
        id: 'unidade',
        header: 'Unidade',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground uppercase">
            {getUnidadeForEstoque(row.original)}
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
      ...(canManageEstoque
        ? [
            {
              id: 'actions',
              header: '',
              cell: ({ row }: { row: { original: EstoqueItem } }) => {
                const item = row.original
                const unidade = getUnidadeForEstoque(item)
                const quantidade = item.quantidade ?? 0
                return (
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-[12px] border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
                      onClick={() =>
                        onOpenBaixa({
                          materialId: item.material?.id ?? '',
                          materialNome: item.material?.nome ?? '—',
                          materialCodigo: item.material?.codigo ?? '',
                          almoxarifadoId: item.almoxarifado?.id ?? '',
                          almoxarifadoNome: item.almoxarifado?.nome ?? '—',
                          quantidadeDisponivel: quantidade,
                          unidade,
                          precoUnitario: item.material?.preco_unitario ?? 0,
                        })
                      }
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Baixa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground hover:text-primary"
                      aria-label={`Transferir ${item.material?.nome ?? 'material'}`}
                      onClick={() => onOpenTransfer(item)}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${item.material?.nome ?? 'material'} do estoque`}
                      onClick={() =>
                        onOpenDelete({
                          id: item.id,
                          materialId: item.material?.id ?? '',
                          materialNome: item.material?.nome ?? '—',
                          almoxarifadoId: item.almoxarifado?.id ?? '',
                          almoxarifadoNome: item.almoxarifado?.nome ?? '—',
                          quantidade,
                          unidade,
                          precoUnitario: item.material?.preco_unitario ?? 0,
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              },
            } satisfies ColumnDef<EstoqueItem>,
          ]
        : []),
    ],
    [canManageEstoque, onOpenBaixa, onOpenDelete, onOpenTransfer],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Estoque desta obra</h2>
        {canManageEstoque && (
          <Button size="sm" onClick={onOpenEntrada}>
            <Plus className="h-4 w-4 mr-1.5" />
            Entrada
          </Button>
        )}
      </div>

      {canManageEstoque && (
        <div className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-4 py-3 text-[13px] text-muted-foreground">
          <span className="flex-shrink-0">📦</span>
          <span>
            Use <strong>Baixa</strong> para registrar uso de materiais. Use <strong>↔</strong> para
            transferir entre almoxarifados.
          </span>
        </div>
      )}

      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <p className="text-[13px]">
            <span className="font-medium text-warning">
              {lowCount} {lowCount === 1 ? 'item' : 'itens'}
            </span>
            <span className="text-muted-foreground"> abaixo do estoque mínimo</span>
          </p>
        </div>
      )}

      {estoque.length > 0 && categorias.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <button
            type="button"
            onClick={() => setFilterCategoria(ESTOQUE_CATEGORY_ALL)}
            className={cn(
              'relative flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
              filterCategoria === ESTOQUE_CATEGORY_ALL
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
            )}
          >
            {filterCategoria === ESTOQUE_CATEGORY_ALL && (
              <motion.div
                layoutId={`${layoutIdPrefix}-estoque-table-cat-pill`}
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">Todas ({estoque.length})</span>
          </button>
          {categorias.map((categoria) => (
            <button
              key={categoria.key}
              type="button"
              onClick={() => setFilterCategoria(categoria.key)}
              className={cn(
                'relative flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                filterCategoria === categoria.key
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
              )}
            >
              {filterCategoria === categoria.key && (
                <motion.div
                  layoutId={`${layoutIdPrefix}-estoque-table-cat-pill`}
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">
                {categoria.label} ({categoria.count})
              </span>
            </button>
          ))}
        </div>
      )}

      {estoque.length === 0 ? (
        <Empty
          icon={Package}
          text="Nenhum material em estoque"
          sub="Registre uma entrada para adicionar materiais."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredEstoque}
          isLoading={isLoading}
          searchPlaceholder="Buscar material..."
        />
      )}
    </div>
  )
}
