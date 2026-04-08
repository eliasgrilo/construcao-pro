import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
} from 'lucide-react'
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  searchColumn?: string
  pageSize?: number
  onRowClick?: (row: TData) => void
  /** Slot for custom filter UI rendered between search and table */
  filterSlot?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Buscar...',
  searchColumn,
  pageSize = 10,
  onRowClick,
  filterSlot,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, globalFilter },
    initialState: { pagination: { pageSize } },
  })

  if (isLoading) {
    // Vary widths per column index so the skeleton looks natural, not uniform.
    const colWidths = ['w-2/5', 'w-1/5', 'w-1/4', 'w-1/6', 'w-1/5', 'w-1/4']
    const colCount = Math.max(columns.length, 3)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 sm:h-10 w-64 rounded-xl" />
        {/* Desktop skeleton — mirrors real table column count */}
        <div className="hidden sm:block rounded-xl border overflow-hidden bg-card">
          {/* Header row */}
          <div className="flex gap-4 px-4 py-3 border-b bg-muted/30">
            {Array.from({ length: colCount }).map((_, i) => (
              <Skeleton key={i} className={`h-3 ${colWidths[i % colWidths.length]}`} />
            ))}
          </div>
          {/* Data rows */}
          {Array.from({ length: 5 }).map((_, row) => (
            <div
              key={row}
              className={`flex gap-4 px-4 py-3.5 border-b last:border-b-0 ${row % 2 === 1 ? 'bg-accent/20' : ''}`}
            >
              {Array.from({ length: colCount }).map((_, col) => (
                <Skeleton
                  key={col}
                  className={`h-4 ${colWidths[(col + row) % colWidths.length]}`}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Mobile skeleton cards */}
        <div className="sm:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border p-4 space-y-3">
              <Skeleton className={`h-5 ${colWidths[i % 2]}`} />
              <div className="space-y-2 pt-2 border-t border-border/40">
                {Array.from({ length: Math.min(colCount - 1, 3) }).map((_, j) => (
                  <div key={j} className="flex justify-between gap-4">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className={`h-3 ${colWidths[(j + 1) % colWidths.length]}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()

  // Build column header labels for mobile cards
  const headerLabels = (headerGroups[0]?.headers ?? [])
    .filter((h) => !h.isPlaceholder)
    .map((h) => ({
      id: h.id,
      label: typeof h.column.columnDef.header === 'string' ? h.column.columnDef.header : h.id,
    }))

  const filteredCount = table.getFilteredRowModel().rows.length
  const totalCount = data.length
  const pageCount = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex + 1

  return (
    <div className="space-y-4">
      {/* Search + count */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-full sm:max-w-sm"
          icon={Search}
        />
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {globalFilter
            ? `${filteredCount} de ${totalCount} registro${totalCount !== 1 ? 's' : ''}`
            : `${totalCount} registro${totalCount !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Filter slot */}
      {filterSlot && <div className="flex flex-wrap items-center gap-2">{filterSlot}</div>}

      {/* ── Mobile: card list ── */}
      <div className="sm:hidden space-y-3">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground bg-gradient-to-b from-accent/10 to-accent/5 rounded-2xl">
            <Inbox className="h-9 w-9 opacity-30" />
            <p className="text-[15px] font-medium">Nenhum registro encontrado</p>
            <p className="text-[13px] opacity-70">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          rows.map((row, idx) => {
            const cells = row.getVisibleCells()
            // First non-empty cell is the "primary" row, rest are details
            const [primaryCell, ...detailCells] = cells
            return (
              <div
                key={row.id}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={`rounded-2xl bg-card border shadow-sm shadow-black/[0.02] px-4 py-4 space-y-3${onRowClick ? ' cursor-pointer active:scale-[0.99] transition-transform' : ''}${idx % 2 === 1 ? ' bg-accent/20' : ''}`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row.original)
                        }
                      }
                    : undefined
                }
              >
                {/* Primary info (first column) - allow wrapping with line-clamp-2 */}
                <div className="text-[15px] font-semibold leading-snug line-clamp-2">
                  {flexRender(primaryCell.column.columnDef.cell, primaryCell.getContext())}
                </div>
                {/* Detail rows: label + value pairs */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  {detailCells.map((cell) => {
                    const headerLabel = headerLabels.find((h) => h.id === cell.column.id)?.label
                    const rendered = flexRender(cell.column.columnDef.cell, cell.getContext())
                    if (!headerLabel) return null
                    return (
                      <div
                        key={cell.id}
                        className="flex items-start justify-between gap-4 min-h-[22px]"
                      >
                        <span className="text-[12px] text-muted-foreground flex-shrink-0 pt-0.5">
                          {headerLabel}
                        </span>
                        <span className="text-[13px] text-right flex-1 min-w-0">{rendered}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Desktop: table ── */}
      <div className="hidden sm:block rounded-xl border overflow-hidden bg-card shadow-sm shadow-black/[0.02]">
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/60">
              {headerGroups.map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-0">
                  {headerGroup.headers.map((header) => {
                    const isSorted = header.column.getIsSorted()
                    return (
                      <TableHead
                        key={header.id}
                        className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/80 h-10"
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="flex cursor-pointer select-none items-center gap-1.5 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60 rounded px-0.5 -mx-0.5"
                            onClick={header.column.getToggleSortingHandler()}
                            aria-label={`Ordenar por ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.id}`}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {isSorted === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-primary" aria-hidden="true" />
                            ) : isSorted === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-primary" aria-hidden="true" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={`transition-colors duration-150${onRowClick ? ' cursor-pointer' : ''}${idx % 2 === 1 ? ' bg-accent/20' : ''} hover:bg-accent/40`}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-[13px] py-3 min-w-0">
                        <div className="min-w-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground bg-gradient-to-b from-accent/10 to-accent/5 rounded-lg py-8">
                      <Inbox className="h-8 w-8 opacity-40" />
                      <p className="text-[13px] font-medium">Nenhum registro encontrado</p>
                      <p className="text-[11px]">Tente ajustar os filtros de busca</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-muted-foreground tabular-nums">
            Página {currentPage} de {pageCount}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex-1 sm:flex-none h-8 px-3 text-[12px]"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Anterior
            </Button>
            {/* Page number indicators */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                let pageNum: number
                if (pageCount <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= pageCount - 2) {
                  pageNum = pageCount - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => table.setPageIndex(pageNum - 1)}
                    className={`h-8 w-8 rounded-lg text-[12px] font-medium tabular-nums transition-colors ${
                      pageNum === currentPage
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex-1 sm:flex-none h-8 px-3 text-[12px]"
            >
              Próxima
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
