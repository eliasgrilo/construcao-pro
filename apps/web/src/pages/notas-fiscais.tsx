import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useNotasFiscais } from '@/hooks/use-supabase'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { CloudUpload, FileText, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'

const statusMap: Record<
  string,
  { label: string; variant: 'warning' | 'info' | 'success' | 'destructive' }
> = {
  PENDENTE: { label: 'Pendente', variant: 'warning' },
  PROCESSADA: { label: 'Processada', variant: 'info' },
  VINCULADA: { label: 'Vinculada', variant: 'success' },
  REJEITADA: { label: 'Rejeitada', variant: 'destructive' },
}

export function NotasFiscaisPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const { toast } = useToast()

  const { data: nfsData, isLoading } = useNotasFiscais()

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data, error } = await supabase.functions.invoke('process-nf-xml', {
        body: formData,
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['notas-fiscais'] })
      setOpen(false)
      setFile(null)
      toast({ title: 'NF-e processada', variant: 'success' })
    } catch (e) {
      toast({ title: 'Erro ao processar', variant: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.xml')) setFile(dropped)
  }, [])

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'numero',
      header: 'Número',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: '#007AFF14' }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: '#007AFF' }} />
          </div>
          <span className="font-medium text-[13px]">NF {row.original.numero}</span>
        </div>
      ),
    },
    {
      accessorKey: 'serie',
      header: 'Série',
      cell: ({ row }) => <span className="text-[13px] tabular-nums">{row.original.serie}</span>,
    },
    {
      accessorKey: 'cnpj_emitente',
      header: 'CNPJ',
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {row.original.cnpj_emitente}
        </span>
      ),
    },
    {
      accessorKey: 'valor_total',
      header: 'Valor',
      cell: ({ row }) => (
        <span className="font-semibold text-[13px] tabular-nums">
          {formatCurrency(row.original.valor_total)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = statusMap[row.original.status]
        return s ? (
          <Badge variant={s.variant}>{s.label}</Badge>
        ) : (
          <Badge variant="secondary">{row.original.status}</Badge>
        )
      },
    },
    {
      accessorKey: '_count.itens',
      header: 'Itens',
      cell: ({ row }) => (
        <span className="tabular-nums text-[13px]">{row.original._count?.itens || 0}</span>
      ),
    },
    {
      accessorKey: 'data_emissao',
      header: 'Emissão',
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {formatDate(row.original.data_emissao)}
        </span>
      ),
    },
  ]

  return (
    <div className="pb-10">
      <div className="px-4 md:px-8 pt-10 pb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Upload e gestão de NF-e</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Upload className="h-4 w-4 mr-1.5" />
          Upload XML
        </Button>
      </div>
      <div className="px-4 md:px-8">
        <DataTable
          columns={columns}
          data={nfsData || []}
          isLoading={isLoading}
          searchPlaceholder="Buscar notas fiscais..."
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload de NF-e XML</DialogTitle>
            <DialogDescription>
              Selecione ou arraste o arquivo XML da nota fiscal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div
              className={`border-2 border-dashed rounded-2xl p-10 sm:p-8 text-center cursor-pointer transition-colors active:scale-[0.98] ${dragOver ? 'border-primary bg-primary/5' : 'hover:border-primary/40'} ${file ? 'border-success/40 bg-success/5' : ''}`}
              onClick={() => document.getElementById('xml-input')?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
            >
              {file ? (
                <>
                  <FileText className="h-10 w-10 sm:h-8 sm:w-8 text-success mx-auto mb-3" />
                  <p className="text-[15px] sm:text-[13px] font-medium">{file.name}</p>
                  <p className="text-[13px] sm:text-[11px] text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <CloudUpload className="h-10 w-10 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-[15px] sm:text-[13px] font-medium">
                    Arraste o XML ou toque para selecionar
                  </p>
                  <p className="text-[13px] sm:text-[11px] text-muted-foreground mt-1">
                    Formato aceito: .xml
                  </p>
                </>
              )}
              <input
                id="xml-input"
                type="file"
                accept=".xml"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  setFile(null)
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={!file} loading={uploading}>
                Processar XML
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
