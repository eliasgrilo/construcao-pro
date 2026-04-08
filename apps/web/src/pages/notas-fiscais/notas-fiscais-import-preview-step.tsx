import { formatCurrency, formatDateShort } from '@/lib/utils'
import { motion } from 'framer-motion'
import { AlertTriangle, Bot, CheckCircle2, Sparkles } from 'lucide-react'
import { PreviewRow } from '../notas-fiscais-import-components'
import type { FornecedorItem, MaterialItem } from '../notas-fiscais-types'
import { formatCNPJ } from '../notas-fiscais-utils'
import type { NotasFiscaisPageModel } from './notas-fiscais-import-dialog-model'

type Props = {
  model: NotasFiscaisPageModel
}

export function NotasFiscaisImportPreviewStep({ model }: Props) {
  const { fornecedores, matchedFornecedorId, materiais, parsed } = model

  if (!parsed) return null

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex-1 min-h-0 overflow-y-auto space-y-4 py-5"
    >
      <div
        className="flex items-center gap-3.5 rounded-[18px] p-4"
        style={{ backgroundColor: '#34C75910' }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: '#34C75920' }}
        >
          <CheckCircle2 className="h-5 w-5" style={{ color: '#34C759' }} />
        </div>
        <div>
          <p className="text-[14px] font-bold" style={{ color: '#34C759' }}>
            XML processado com sucesso
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {parsed.itens.length}{' '}
            {parsed.itens.length === 1 ? 'item encontrado' : 'itens encontrados'}
          </p>
        </div>
      </div>

      {parsed.nf.finalidade !== null && parsed.nf.finalidade !== 1 && (
        <div
          className="flex items-start gap-3 rounded-[18px] p-4"
          style={{ backgroundColor: '#FF950015' }}
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#FF9500' }} />
          <div>
            <p className="text-[13px] font-bold" style={{ color: '#FF9500' }}>
              {parsed.nf.finalidade === 4
                ? 'Nota de Devolução (finNFe=4)'
                : parsed.nf.finalidade === 2
                  ? 'NF-e Complementar (finNFe=2)'
                  : `NF-e de Ajuste (finNFe=${parsed.nf.finalidade})`}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {parsed.nf.finalidade === 4
                ? 'Esta é uma nota de devolução. Não dará entrada de estoque nem gerará conta a pagar.'
                : 'Esta NF-e não é uma compra normal. Verifique antes de prosseguir — o sistema processará sem lançamentos de estoque ou financeiro.'}
            </p>
          </div>
        </div>
      )}

      <div
        className="rounded-[18px] border divide-y overflow-hidden"
        style={{ borderColor: 'rgba(0,0,0,0.07)' }}
      >
        <PreviewRow
          label="Número / Série"
          value={`${parsed.nf.numero.padStart(6, '0')} — Série ${parsed.nf.serie}`}
          bold
        />
        <PreviewRow label="Emitente (CNPJ)" value={formatCNPJ(parsed.nf.cnpj_emitente)} mono />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[12px] text-muted-foreground shrink-0">Fornecedor</p>
          {matchedFornecedorId ? (
            <div className="flex items-center gap-1.5">
              <div
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: '#34C759' }}
              />
              <p
                className="text-[13px] font-semibold text-right truncate"
                style={{ color: '#34C759' }}
              >
                {(fornecedores as FornecedorItem[]).find((f) => f.id === matchedFornecedorId)
                  ?.nome ?? ''}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: '#FF9500' }}
              />
              <p className="text-[13px] text-right" style={{ color: '#FF9500' }}>
                Não cadastrado
              </p>
            </div>
          )}
        </div>
        {parsed.nf.cnpj_destinatario && (
          <PreviewRow label="Destinatário" value={formatCNPJ(parsed.nf.cnpj_destinatario)} mono />
        )}
        <PreviewRow label="Data de Emissão" value={formatDateShort(parsed.nf.data_emissao)} />
        <PreviewRow label="Valor Total" value={formatCurrency(parsed.nf.valor_total)} bold />
      </div>

      {parsed.itens.length > 0 && (
        <div
          className="rounded-[18px] border overflow-hidden"
          style={{ borderColor: 'rgba(0,0,0,0.07)' }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(0,0,0,0.025)' }}
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Itens ({parsed.itens.length})
            </p>
          </div>
          <div className="divide-y max-h-44 overflow-y-auto">
            {parsed.itens.map((item, i) => (
              <div
                key={item.descricao + String(i)}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <p className="text-[13px] font-medium line-clamp-1 flex-1">{item.descricao}</p>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-semibold tabular-nums">
                    {formatCurrency(item.valor_total)}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {item.quantidade} {item.unidade}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-3.5 rounded-[18px] p-4 border"
        style={{ backgroundColor: '#007AFF06', borderColor: '#007AFF20' }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: '#007AFF15' }}
        >
          <Sparkles className="h-5 w-5" style={{ color: '#007AFF' }} />
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: '#007AFF' }}>
            Vinculação Inteligente com Gemini AI
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            A IA identificará os materiais automaticamente
          </p>
        </div>
      </div>

      {(materiais?.length ?? 0) === 0 && (
        <div
          className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-[12px]"
          style={{ backgroundColor: '#FF950012', color: '#FF9500' }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Cadastre materiais no catálogo antes de analisar a NF-e.
        </div>
      )}
    </motion.div>
  )
}
