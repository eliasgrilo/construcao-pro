import { KeyboardToolbar } from '@/components/KeyboardToolbar/KeyboardToolbar'
/**
 * fornecedor-detail-modal.tsx
 * EditFornecedorModal extraído de fornecedor-detail.tsx
 */
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { type FornecedorRow, useUpdateFornecedor } from '@/hooks/use-supabase'
import { useFormFieldNavigation } from '@/hooks/useFormFieldNavigation'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { iosSheetDialogCn } from './dialog-styles'

const modalCn = iosSheetDialogCn

export function EditFornecedorModal({
  open,
  onOpenChange,
  fornecedor,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  fornecedor: FornecedorRow
}) {
  const { toast } = useToast()
  const updateMutation = useUpdateFornecedor()

  const [nome, setNome] = useState(fornecedor.nome ?? '')
  const [nomeFantasia, setNomeFantasia] = useState(fornecedor.nome_fantasia ?? '')
  const [cnpj, setCnpj] = useState(fornecedor.cnpj ?? '')
  const [inscricaoEstadual, setInscricaoEstadual] = useState(fornecedor.inscricao_estadual ?? '')
  const [telefone, setTelefone] = useState(fornecedor.telefone ?? '')
  const [email, setEmail] = useState(fornecedor.email ?? '')
  const [endereco, setEndereco] = useState(fornecedor.endereco ?? '')
  const [cidade, setCidade] = useState(fornecedor.cidade ?? '')
  const [estado, setEstado] = useState(fornecedor.estado ?? '')
  const [observacao, setObservacao] = useState(fornecedor.observacao ?? '')
  const [ativo, setAtivo] = useState(fornecedor.ativo ?? true)

  const formRef = useRef<HTMLDivElement>(null)
  const { focusNext, focusPrev, dismiss, canGoPrev, canGoNext } = useFormFieldNavigation(formRef)

  const resetFields = () => {
    setNome(fornecedor.nome ?? '')
    setNomeFantasia(fornecedor.nome_fantasia ?? '')
    setCnpj(fornecedor.cnpj ?? '')
    setInscricaoEstadual(fornecedor.inscricao_estadual ?? '')
    setTelefone(fornecedor.telefone ?? '')
    setEmail(fornecedor.email ?? '')
    setEndereco(fornecedor.endereco ?? '')
    setCidade(fornecedor.cidade ?? '')
    setEstado(fornecedor.estado ?? '')
    setObservacao(fornecedor.observacao ?? '')
    setAtivo(fornecedor.ativo ?? true)
  }

  const handleSave = () => {
    if (!nome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'error' })
      return
    }
    updateMutation.mutate(
      {
        id: fornecedor.id,
        nome: nome.trim(),
        nome_fantasia: nomeFantasia.trim() || null,
        cnpj: cnpj.trim() || undefined,
        inscricao_estadual: inscricaoEstadual.trim() || null,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        endereco: endereco.trim() || undefined,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        observacao: observacao.trim() || undefined,
        ativo,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast({ title: 'Fornecedor atualizado', variant: 'success' })
        },
        onError: () => toast({ title: 'Erro ao atualizar', variant: 'error' }),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (updateMutation.isPending) return
        onOpenChange(v)
        if (!v) resetFields()
      }}
    >
      <DialogContent className={modalCn}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#F2F2F7] dark:bg-[#1C1C1E] px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (updateMutation.isPending) return
                onOpenChange(false)
              }}
              disabled={updateMutation.isPending}
              className="text-[16px] text-[#007AFF] min-w-[64px] text-left disabled:opacity-30 transition-opacity"
            >
              Cancelar
            </button>
            <DialogTitle className="text-[16px] font-semibold">Editar Fornecedor</DialogTitle>
            <DialogDescription className="sr-only">Edite os dados do fornecedor</DialogDescription>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="text-[16px] font-semibold text-[#007AFF] disabled:text-muted-foreground/30 min-w-[64px] text-right transition-colors"
            >
              {updateMutation.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>

        <div ref={formRef} className="flex-1 min-h-0 overflow-y-auto px-5 space-y-4 pb-6">
          {/* Razão Social */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Razão Social / Nome <span className="text-[#FF3B30]">*</span>
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do fornecedor"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>

          {/* Nome Fantasia */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Nome Fantasia
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                placeholder="Nome comercial (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>

          {/* CNPJ + IE + Telefone */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Identificação
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="CNPJ (opcional)"
                inputMode="numeric"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 font-mono"
              />
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
              <input
                value={inscricaoEstadual}
                onChange={(e) => setInscricaoEstadual(e.target.value)}
                placeholder="Inscrição Estadual (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 font-mono"
              />
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Telefone (opcional)"
                inputMode="tel"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Contato Digital
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>

          {/* Localização */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Localização
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Endereço (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
              <div className="h-px bg-border/10 dark:bg-white/[0.06] ml-4" />
              <div className="flex items-center">
                <input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade (opcional)"
                  className="flex-1 px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
                />
                <div className="w-px h-6 bg-border/20 dark:bg-white/[0.08] flex-shrink-0" />
                <input
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  placeholder="UF"
                  maxLength={2}
                  className="w-[64px] px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25 text-center uppercase"
                />
              </div>
            </div>
          </div>

          {/* Observação */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Observação
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Notas internas (opcional)"
                className="w-full px-4 py-3.5 bg-transparent text-[15px] border-0 focus:outline-none placeholder:text-muted-foreground/25"
              />
            </div>
          </div>

          {/* Status toggle */}
          <div>
            <p className="text-[12px] text-muted-foreground/45 uppercase tracking-wider font-semibold px-4 mb-1.5">
              Status
            </p>
            <div className="rounded-[14px] bg-white dark:bg-white/[0.07] overflow-hidden">
              <button
                type="button"
                onClick={() => setAtivo(!ativo)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-[15px]"
              >
                <span className={ativo ? 'text-foreground' : 'text-muted-foreground/50'}>
                  {ativo ? 'Ativo' : 'Inativo'}
                </span>
                {/* iOS-style toggle */}
                <div
                  className={cn(
                    'relative h-[31px] w-[51px] rounded-full transition-colors duration-200',
                    ativo ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-[#39393C]',
                  )}
                >
                  <motion.div
                    animate={{ x: ativo ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
        <KeyboardToolbar
          onNext={focusNext}
          onPrev={focusPrev}
          onDone={dismiss}
          hasPrev={canGoPrev}
          hasNext={canGoNext}
        />
      </DialogContent>
    </Dialog>
  )
}
