import { motion } from 'framer-motion'
import { CheckCircle2, CloudUpload, FileText } from 'lucide-react'
import type { NotasFiscaisPageModel } from './notas-fiscais-import-dialog-model'

type Props = {
  model: NotasFiscaisPageModel
}

export function NotasFiscaisImportSelectStep({ model }: Props) {
  const { dragOver, file, fileInputRef, handleDrop, handleFileSelect, setDragOver } = model

  return (
    <motion.div
      key="select"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex-1 min-h-0 overflow-y-auto space-y-4 py-5"
    >
      <button
        type="button"
        aria-label="Área de upload"
        className="relative flex w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        style={{
          borderColor: dragOver ? '#007AFF' : file ? '#34C75960' : 'rgba(0,0,0,0.12)',
          backgroundColor: dragOver ? '#007AFF08' : file ? '#34C75908' : undefined,
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
      >
        {file ? (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-[22px]"
              style={{ backgroundColor: '#34C75918' }}
            >
              <FileText className="h-9 w-9" style={{ color: '#34C759' }} />
            </motion.div>
            <p className="text-[16px] font-bold">{file.name}</p>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <div
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
              style={{ backgroundColor: '#34C75915', color: '#34C759' }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Arquivo selecionado — clique para trocar
            </div>
          </>
        ) : (
          <>
            <motion.div
              animate={{ y: dragOver ? -4 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-[22px]"
              style={{ backgroundColor: '#007AFF14' }}
            >
              <CloudUpload className="h-9 w-9" style={{ color: '#007AFF' }} />
            </motion.div>
            <p className="text-[16px] font-bold">
              {dragOver ? 'Solte aqui' : 'Arraste ou clique para selecionar'}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              Arquivo XML de NF-e (nfeProc ou NFe)
            </p>
            <div
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold"
              style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: '#8E8E93' }}
            >
              <FileText className="h-3 w-3" />
              nfeProc.xml · NFe.xml
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,application/xml,text/xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileSelect(f)
            e.target.value = ''
          }}
        />
      </button>
    </motion.div>
  )
}
