import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Receipt, Trash2 } from 'lucide-react'
import { PreviewRow } from '../notas-fiscais-import-components'
import type { NFRow } from '../notas-fiscais-types'
import { STATUS_CONFIG, formatCNPJ } from '../notas-fiscais-utils'

type SelectedItemRow = {
  id: string
  descricao: string
  quantidade: number
  unidade: string
  valor_unitario: number
  valor_total: number
  material_id: string | null
  ncm: string | null
  cfop: string | null
}

type ContaPagarParcelaRow = {
  id: string
  status: string
  vencimento: string
  valor: number
}

type NFeContaPagarRow = {
  id: string
  descricao: string
  valor_total: number
  contas_pagar_parcelas?: ContaPagarParcelaRow[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedNF: NFRow | null
  canManageNotasFiscais: boolean
  onDeleteRequest: (nf: NFRow) => void
  selectedItens: SelectedItemRow[]
  itensLoading: boolean
  nfeContasPagar: NFeContaPagarRow[]
}

export function NotasFiscaisDetailDialog({
  open,
  onOpenChange,
  selectedNF,
  canManageNotasFiscais,
  onDeleteRequest,
  selectedItens,
  itensLoading,
  nfeContasPagar,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {selectedNF && (
        <DialogContent className="sm:max-w-xl max-h-full flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: '#007AFF12' }}
              >
                <Receipt className="h-4 w-4" style={{ color: '#007AFF' }} />
              </div>
              <span>NF-e {selectedNF.numero.padStart(6, '0')}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detalhes completos da nota fiscal selecionada
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-5 min-h-0 py-1">
            {(() => {
              const cfg = STATUS_CONFIG[selectedNF.status]
              return cfg ? (
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold"
                    style={{ backgroundColor: cfg.bg, color: cfg.text }}
                  >
                    <span
                      className="h-[6px] w-[6px] rounded-full"
                      style={{ backgroundColor: cfg.dot }}
                    />
                    {cfg.label}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    Série {selectedNF.serie}
                  </span>
                </div>
              ) : null
            })()}
            <div
              className="rounded-[18px] border divide-y overflow-hidden"
              style={{ borderColor: 'rgba(0,0,0,0.07)' }}
            >
              {selectedNF.nome_emitente && (
                <PreviewRow label="Emitente" value={selectedNF.nome_emitente} />
              )}
              <PreviewRow label="CNPJ Emitente" value={formatCNPJ(selectedNF.cnpj_emitente)} mono />
              {selectedNF.cnpj_destinatario && (
                <PreviewRow
                  label="CNPJ Destinatário"
                  value={formatCNPJ(selectedNF.cnpj_destinatario)}
                  mono
                />
              )}
              <PreviewRow
                label="Data de Emissão"
                value={formatDateShort(selectedNF.data_emissao)}
              />
              <PreviewRow label="Valor Total" value={formatCurrency(selectedNF.valor_total)} bold />
            </div>
            <div
              className="rounded-[16px] border px-4 py-3.5"
              style={{ borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.018)' }}
            >
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Chave de Acesso
              </p>
              <p className="font-mono text-[10px] text-muted-foreground break-all leading-relaxed tracking-wide">
                {selectedNF.chave_acesso.match(/.{1,4}/g)?.join(' ') ?? selectedNF.chave_acesso}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Itens ({selectedNF._count?.itens || 0})
              </p>
              {itensLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div
                    className="h-7 w-7 rounded-full border-[2.5px] border-t-transparent animate-spin"
                    style={{ borderColor: '#007AFF25', borderTopColor: '#007AFF' }}
                  />
                </div>
              ) : selectedItens.length > 0 ? (
                <div
                  className="rounded-[18px] border divide-y overflow-hidden"
                  style={{ borderColor: 'rgba(0,0,0,0.07)' }}
                >
                  {selectedItens.map((item) => (
                    <div key={item.id} className="px-4 py-3.5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold line-clamp-1">{item.descricao}</p>
                          {item.material_id && (
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={{ backgroundColor: '#34C75915', color: '#34C759' }}
                            >
                              Vinculado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="tabular-nums font-medium">
                            {item.quantidade} {item.unidade}
                          </span>
                          {item.ncm && <span className="ml-1.5 font-mono">· NCM {item.ncm}</span>}
                          {item.cfop && (
                            <span className="ml-1.5 font-mono">· CFOP {item.cfop}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold tabular-nums">
                          {formatCurrency(item.valor_total)}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                          {formatCurrency(item.valor_unitario)}/un
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-[16px] border px-4 py-8 text-center"
                  style={{ borderColor: 'rgba(0,0,0,0.07)' }}
                >
                  <p className="text-[13px] text-muted-foreground">Nenhum item registrado</p>
                </div>
              )}
            </div>

            {selectedNF.status === 'VINCULADA' && nfeContasPagar.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Contas a Pagar ({nfeContasPagar.length})
                </p>
                <div
                  className="rounded-[18px] border divide-y overflow-hidden"
                  style={{ borderColor: 'rgba(0,0,0,0.07)' }}
                >
                  {nfeContasPagar.map((cp) => {
                    const parcelas = cp.contas_pagar_parcelas ?? []
                    const totalParcelas = parcelas.length
                    const pagas = parcelas.filter((p) => p.status === 'PAGO').length
                    const atrasadas = parcelas.filter((p) => p.status === 'ATRASADO').length
                    return (
                      <div key={cp.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold line-clamp-1">{cp.descricao}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {totalParcelas} parcela(s) · {pagas} paga(s)
                              {atrasadas > 0 && (
                                <span style={{ color: '#FF3B30' }}> · {atrasadas} atrasada(s)</span>
                              )}
                            </p>
                          </div>
                          <p className="text-[13px] font-bold tabular-nums shrink-0">
                            {formatCurrency(cp.valor_total)}
                          </p>
                        </div>
                        {parcelas.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {parcelas.map((p) => {
                              const statusColor =
                                p.status === 'PAGO'
                                  ? '#34C759'
                                  : p.status === 'ATRASADO'
                                    ? '#FF3B30'
                                    : '#FF9500'
                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span style={{ color: statusColor }} className="font-medium">
                                    {p.status}
                                  </span>
                                  <span className="text-muted-foreground tabular-nums">
                                    venc. {formatDateShort(p.vencimento)} ·{' '}
                                    {formatCurrency(p.valor)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter
            className="shrink-0 pt-4 border-t"
            style={{ borderColor: 'rgba(0,0,0,0.06)' }}
          >
            {canManageNotasFiscais && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
                onClick={() => {
                  onOpenChange(false)
                  onDeleteRequest(selectedNF)
                }}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remover
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
