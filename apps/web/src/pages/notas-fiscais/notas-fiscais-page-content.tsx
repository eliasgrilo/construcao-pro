import { motion } from 'framer-motion'
import { Receipt, Upload } from 'lucide-react'
import {
  EmptySearch,
  EmptyState,
  FilterPills,
  LoadingSkeleton,
  MonthHeader,
  NFCard,
  SearchBar,
  SummaryCard,
} from '../notas-fiscais-ui-components'
import { nfListVariants } from '../notas-fiscais-utils'
import {
  NotasFiscaisDeleteConfirmDialog,
  NotasFiscaisDeleteFinanceiroDialog,
} from './notas-fiscais-delete-dialogs'
import { NotasFiscaisDetailDialog } from './notas-fiscais-detail-dialog'
import { NotasFiscaisImportDialog } from './notas-fiscais-import-dialog'
import type { useNotasFiscaisPage } from './use-notas-fiscais-page'

type NotasFiscaisPageModel = ReturnType<typeof useNotasFiscaisPage>

export function NotasFiscaisPageContent(model: NotasFiscaisPageModel) {
  const {
    canManageNotasFiscais,
    deleteNF,
    deleteTarget,
    filterCounts,
    handleDelete,
    handleDeleteRequest,
    isLoading,
    itensLoading,
    linkedContasPagar,
    nfeContasPagar,
    nfs,
    nfsByMonth,
    nfsError,
    searchQuery,
    selectedItens,
    selectedNF,
    setActiveFilter,
    setDeleteTarget,
    setLinkedContasPagar,
    setSearchQuery,
    setSelectedNF,
    setShowDeleteConfirm,
    setShowDeleteFinanceiroWarning,
    setShowDetail,
    setUploadStep,
    showDeleteConfirm,
    showDeleteFinanceiroWarning,
    showDetail,
    stats,
    activeFilter,
  } = model

  if (nfsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-[17px] font-semibold">Erro ao carregar notas fiscais</p>
        <p className="text-[13px] text-muted-foreground max-w-xs">
          Não foi possível carregar as notas fiscais. Verifique sua conexão e tente novamente.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white"
          style={{ backgroundColor: '#007AFF' }}
        >
          Recarregar
        </button>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <div className="px-5 md:px-8 pt-8 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-[8px]"
                style={{ backgroundColor: '#007AFF15' }}
              >
                <Receipt className="h-3.5 w-3.5" style={{ color: '#007AFF' }} />
              </div>
              <span className="text-[12px] font-semibold" style={{ color: '#007AFF' }}>
                Gestão Fiscal
              </span>
            </div>
            <h1 className="text-[32px] md:text-[38px] font-bold tracking-tight leading-none">
              Notas Fiscais
            </h1>
            <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
              Importação inteligente de NF-e com vinculação de estoque via IA
            </p>
          </div>
          {canManageNotasFiscais && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setUploadStep('select')}
              className="mt-1 shrink-0 flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-[14px] font-semibold text-white"
              style={{ backgroundColor: '#007AFF', boxShadow: '0 4px 16px rgba(0,122,255,0.28)' }}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar XML</span>
              <span className="sm:hidden">Importar</span>
            </motion.button>
          )}
        </div>
      </div>

      {nfs.length > 0 && (
        <div className="px-5 md:px-8 mb-5">
          <SummaryCard
            total={stats.valorTotal}
            count={stats.total}
            vinculadas={stats.vinculadas}
            processadas={stats.processadas}
            pendentes={stats.pendentes}
            rejeitadas={stats.rejeitadas}
          />
        </div>
      )}

      {(nfs.length > 0 || isLoading) && (
        <div className="px-5 md:px-8 mb-5 space-y-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <FilterPills active={activeFilter} onChange={setActiveFilter} counts={filterCounts} />
        </div>
      )}

      <div className="px-5 md:px-8">
        {isLoading ? (
          <LoadingSkeleton />
        ) : nfs.length === 0 ? (
          <EmptyState onImport={() => setUploadStep('select')} />
        ) : nfsByMonth.length === 0 ? (
          <EmptySearch
            onClear={() => {
              setSearchQuery('')
              setActiveFilter('all')
            }}
          />
        ) : (
          <motion.div
            variants={nfListVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {nfsByMonth.map((group) => (
              <div key={group.key}>
                <MonthHeader label={group.label} total={group.total} />
                <div className="space-y-2.5">
                  {group.nfs.map((nf) => (
                    <NFCard
                      key={nf.id}
                      nf={nf}
                      onOpen={() => {
                        setSelectedNF(nf)
                        setShowDetail(true)
                      }}
                      onDelete={() => {
                        handleDeleteRequest(nf)
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <NotasFiscaisImportDialog {...model} />

      <NotasFiscaisDetailDialog
        open={showDetail}
        onOpenChange={setShowDetail}
        selectedNF={selectedNF}
        canManageNotasFiscais={canManageNotasFiscais}
        onDeleteRequest={handleDeleteRequest}
        selectedItens={
          selectedItens as Array<{
            id: string
            descricao: string
            quantidade: number
            unidade: string
            valor_unitario: number
            valor_total: number
            material_id: string | null
            ncm: string | null
            cfop: string | null
          }>
        }
        itensLoading={itensLoading}
        nfeContasPagar={nfeContasPagar}
      />

      <NotasFiscaisDeleteFinanceiroDialog
        open={showDeleteFinanceiroWarning}
        onOpenChange={setShowDeleteFinanceiroWarning}
        deleteTarget={deleteTarget}
        linkedContasPagar={linkedContasPagar}
        canManageNotasFiscais={canManageNotasFiscais}
        onCancel={() => {
          setShowDeleteFinanceiroWarning(false)
          setDeleteTarget(null)
          setLinkedContasPagar([])
        }}
        onDeleteOnlyNF={() => handleDelete(false)}
        onDeleteWithFinanceiro={() => handleDelete(true)}
        loading={deleteNF.isPending}
      />

      <NotasFiscaisDeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        deleteTarget={deleteTarget}
        canManageNotasFiscais={canManageNotasFiscais}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setDeleteTarget(null)
        }}
        onConfirm={() => handleDelete()}
        loading={deleteNF.isPending}
      />
    </div>
  )
}
