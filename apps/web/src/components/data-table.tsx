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
import { ArrowUpDown, ChevronLeft, ChevronRight, Inbox, Search } from 'lucide-react'
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  searchColumn?: string
  pageSize?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Buscar...',
  searchColumn,
  pageSize = 10,
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 sm:h-10 w-64 rounded-xl" />
        {/* Desktop skeleton */}
        <div className="hidden sm:block rounded-xl border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
        {/* Mobile skeleton cards */}
        <div className="sm:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()

  // Build column header labels for mobile cards
  const headerLabels = headerGroups[0]?.headers
    .filter((h) => !h.isPlaceholder)
    .map((h) => ({
      id: h.id,
      label:
        typeof h.column.columnDef.header === 'string'
          ? h.column.columnDef.header
          : h.id,
    })) ?? []

  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-full sm:max-w-sm"
          icon={Search}
        />
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {filteredCount} registro{filteredCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Mobile: card list ── */}
      <div className="sm:hidden space-y-3">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Inbox className="h-9 w-9 opacity-30" />
            <p className="text-[15px] font-medium">Nenhum registro encontrado</p>
            <p className="text-[13px] opacity-70">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          rows.map((row) => {
            const cells = row.getVisibleCells()
            // First non-empty cell is the "primary" row, rest are details
            const [primaryCell, ...detailCells] = cells
            return (
              <div
                key={row.id}
                className="rounded-2xl bg-card border px-4 py-4 space-y-3"
              >
                {/* Primary info (first column) */}
                <div className="text-[15px] font-semibold leading-snug">
                  {flexRender(primaryCell.column.columnDef.cell, primaryCell.getContext())}
                </div>
                {/* Detail rows: label + value pairs */}
                <div className="space-y-2">
                  {detailCells.map((cell) => {
                    const headerLabel = headerLabels.find((h) => h.id === cell.column.id)?.label
                    const rendered = flexRender(cell.column.columnDef.cell, cell.getContext())
                    // Skip empty/null/dash cells
                    return (
                      <div key={cell.id} className="flex items-start justify-between gap-4 min-h-[22px]">
                        {headerLabel && (
                          <span className="text-[12px] text-muted-foreground flex-shrink-0 pt-0.5 w-[90px]">
                            {headerLabel}
                          </span>
                        )}
                        <span className="text-[13px] text-right flex-1 min-w-0">
                          {rendered}
                        </span>
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
      <div className="hidden sm:block rounded-xl border overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            {headerGroups.map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[12px] uppercase tracking-wider font-semibold text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'flex cursor-pointer select-none items-center gap-1.5 hover:text-foreground transition-colors'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-accent/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-[13px]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
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

      {/* Pagination */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground tabular-nums">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex-1 sm:flex-none"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex-1 sm:flex-none"
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
