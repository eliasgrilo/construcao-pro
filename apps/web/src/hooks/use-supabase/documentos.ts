import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { generateId } from '@/lib/utils'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Documentos — Gestão documental (categorias + upload/storage)
// ═══════════════════════════════════════════════════════════

export interface DocumentoCategoria {
  id: string
  nome: string
  cor: string
  icone: string
  created_at: string
}

export interface Documento {
  id: string
  nome: string
  descricao: string | null
  storage_path: string
  categoria_id: string | null
  obra_id: string | null
  tipo_arquivo: string
  tamanho: number
  created_at: string
  // Joined
  documento_categorias?: DocumentoCategoria | null
  obras?: { id: string; nome: string } | null
}

type DocumentoCategoriaRow = Database['public']['Tables']['documento_categorias']['Row']
type DocumentoRow = Database['public']['Tables']['documentos']['Row']
type DocumentoJoinedRow = DocumentoRow & {
  documento_categorias: DocumentoCategoriaRow | null
  obras: { id: string; nome: string } | null
}

function mapDocumentoCategoria(row: DocumentoCategoriaRow): DocumentoCategoria {
  return row
}

function mapDocumento(row: DocumentoJoinedRow): Documento {
  return {
    ...row,
    documento_categorias: row.documento_categorias
      ? mapDocumentoCategoria(row.documento_categorias)
      : null,
  }
}

/* ── Categorias de Documento ── */

export function useDocumentoCategorias() {
  return useQuery<DocumentoCategoria[]>({
    queryKey: queryKeys.documentos.categorias(),
    staleTime: 1000 * 60, // 1 min — dropdown data, refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase.from('documento_categorias').select('*').order('nome')
      if (error) throw error
      return (data ?? []).map(mapDocumentoCategoria)
    },
  })
}

export function useCreateDocumentoCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { nome: string; cor?: string; icone?: string }) => {
      const { data, error } = await supabase
        .from('documento_categorias')
        .insert(body)
        .select()
        .single()
      if (error) throw error
      return mapDocumentoCategoria(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documentos.categorias() })
      qc.invalidateQueries({ queryKey: queryKeys.documentos.lista() })
    },
  })
}

export function useUpdateDocumentoCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string; nome?: string; cor?: string; icone?: string }) => {
      const { data, error } = await supabase
        .from('documento_categorias')
        .update(body)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return mapDocumentoCategoria(data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documentos.categorias() })
      qc.invalidateQueries({ queryKey: queryKeys.documentos.lista() })
    },
  })
}

export function useDeleteDocumentoCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('documento_categorias')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) {
        throw new Error('A categoria não pôde ser excluída. Verifique suas permissões.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documentos.categorias() })
      qc.invalidateQueries({ queryKey: queryKeys.documentos.lista() })
    },
  })
}

/* ── Documentos ── */

export function useDocumentos() {
  return useQuery<Documento[]>({
    queryKey: queryKeys.documentos.lista(),
    staleTime: 30_000, // 30s — refreshed by realtime
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos')
        .select('*, documento_categorias(*), obras(id, nome)')
        .order('created_at', { ascending: false })
        .limit(200)
        .overrideTypes<DocumentoJoinedRow[]>()
      if (error) throw error
      return (data ?? []).map(mapDocumento)
    },
  })
}

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export function useUploadDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      file,
      nome,
      descricao,
      categoria_id,
      obra_id,
    }: {
      file: File
      nome: string
      descricao?: string
      categoria_id?: string | null
      obra_id?: string | null
    }) => {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
        throw new Error(
          `Tipo de arquivo não permitido: ${file.type || 'desconhecido'}. São aceitos: PDF, JPEG, PNG e WebP.`,
        )
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        throw new Error(
          `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O limite é 10 MB.`,
        )
      }

      // 1. Upload file to Supabase Storage
      const ext = file.name.split('.').pop() || 'bin'
      const storagePath = `${generateId('documento')}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(storagePath, file, { contentType: file.type })
      if (uploadError) throw uploadError

      // 2. Insert document record — clean up orphaned file if DB insert fails
      const { data, error } = await supabase
        .from('documentos')
        .insert({
          nome,
          descricao: descricao || null,
          storage_path: storagePath,
          categoria_id: categoria_id || null,
          obra_id: obra_id || null,
          tipo_arquivo: file.type || 'application/octet-stream',
          tamanho: file.size,
        })
        .select('*, documento_categorias(*), obras(id, nome)')
        .single()
        .overrideTypes<DocumentoJoinedRow>()
      if (error) {
        // Best-effort cleanup: remove uploaded file so storage doesn't leak
        await supabase.storage.from('documentos').remove([storagePath])
        throw error
      }
      return mapDocumento(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documentos.lista() }),
  })
}

export function useDeleteDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      // 1. Delete record and verify that at least one row was actually removed.
      // PostgREST can return no error when RLS blocks the delete but affects 0 rows.
      const { data: deletedRow, error } = await supabase
        .from('documentos')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!deletedRow?.id) {
        throw new Error('O arquivo não pôde ser excluído. Verifique suas permissões.')
      }

      // 2. Delete from storage (best-effort — proceed even if file already absent)
      await supabase.storage.from('documentos').remove([storagePath])
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documentos.lista() }),
  })
}

/** Get a signed URL for a document (valid for 1 hour) */
export function useDocumentoUrl() {
  return useMutation({
    mutationFn: async ({ storagePath }: { storagePath: string; tipoArquivo?: string }) => {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(storagePath, 3600)
      if (error) throw error
      if (!data?.signedUrl) throw new Error('URL assinada não disponível')
      return data.signedUrl
    },
  })
}
