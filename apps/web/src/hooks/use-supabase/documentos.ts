import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { generateId } from '@/lib/utils'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

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

// Maps file extensions that browsers commonly report as empty string to a valid MIME type.
// This ensures Supabase Storage receives a meaningful Content-Type header for CAD / BIM files.
const EXT_CONTENT_TYPE: Record<string, string> = {
  dwg: 'application/acad',
  dxf: 'application/dxf',
  rvt: 'application/octet-stream',
  rfa: 'application/octet-stream',
  ifc: 'application/x-step',
  skp: 'application/octet-stream',
  nwd: 'application/octet-stream',
  nwc: 'application/octet-stream',
  '3ds': 'application/octet-stream',
  obj: 'text/plain',
  stl: 'model/stl',
  step: 'application/x-step',
  stp: 'application/x-step',
  iges: 'model/iges',
  igs: 'model/iges',
  kml: 'application/vnd.google-earth.kml+xml',
  kmz: 'application/vnd.google-earth.kmz',
}
const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

/** Returns the best Content-Type for a file: browser-reported MIME → extension map → octet-stream. */
function resolveContentType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream'
}

/**
 * Escreve o arquivo enviado diretamente no Cache API sob a chave estável
 * (storagePath). Executado logo após o upload bem-sucedido, enquanto o
 * arquivo ainda está em memória — sem nenhuma requisição extra de rede.
 * Isso garante disponibilidade offline imediata de todo arquivo enviado.
 */
async function cacheDocumentoFromFile(
  file: File,
  storagePath: string,
  contentType: string,
): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open('construcao-pro-docs')
    const existing = await cache.match(storagePath)
    if (existing) return
    const response = new Response(file, {
      headers: { 'Content-Type': contentType, 'Content-Length': String(file.size) },
    })
    await cache.put(storagePath, response)
  } catch {
    // Cache API indisponível ou sem espaço — não bloqueia o fluxo.
  }
}

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
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        throw new Error(
          `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O limite é 50 MB.`,
        )
      }

      // 1. Upload file to Supabase Storage
      const ext = file.name.split('.').pop() || 'bin'
      const storagePath = `${generateId('documento')}.${ext}`
      const contentType = resolveContentType(file)
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(storagePath, file, { contentType })
      if (uploadError) throw uploadError

      // 3. Cache the file locally — fire-and-forget, never blocks the upload flow.
      // The file is already in memory; writing to Cache API costs zero extra requests.
      cacheDocumentoFromFile(file, storagePath, contentType).catch(() => undefined)

      // 2. Insert document record — clean up orphaned file if DB insert fails
      const { data, error } = await supabase
        .from('documentos')
        .insert({
          nome,
          descricao: descricao || null,
          storage_path: storagePath,
          categoria_id: categoria_id || null,
          obra_id: obra_id || null,
          tipo_arquivo: resolveContentType(file),
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
    onSuccess: (_, { storagePath }) => {
      clearDocumentoUrlCache(storagePath)
      qc.invalidateQueries({ queryKey: queryKeys.documentos.lista() })
    },
  })
}

// Module-level cache: reuse signed URLs within their validity window (60 min - 5 min buffer)
const CACHE_TTL_MS = 55 * 60 * 1000
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/** Returns a cached inline URL if still valid, otherwise null. */
export function peekDocumentoUrl(storagePath: string): string | null {
  const entry = signedUrlCache.get(storagePath)
  if (!entry || Date.now() > entry.expiresAt) {
    signedUrlCache.delete(storagePath)
    return null
  }
  return entry.url
}

/** Removes a cached URL (call after delete so stale URLs are not reused). */
export function clearDocumentoUrlCache(storagePath: string): void {
  signedUrlCache.delete(storagePath)
  // Also evict from SW Cache API so deleted files are not served offline.
  evictDocumentoFromSwCache(storagePath)
}

/**
 * Sends a message to the SW to remove a document from the offline cache.
 * No-op in dev or when SW is unavailable.
 */
function evictDocumentoFromSwCache(storagePath: string): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready
    .then((reg) => reg.active?.postMessage({ type: 'EVICT_DOCUMENTO', storagePath }))
    .catch(() => undefined)
}

/**
 * Sends the signed URL to the SW so it can fetch and cache the file
 * under the stable storagePath key. This makes previously viewed documents
 * available offline even after the signed URL expires.
 */
function notifySwToCache(signedUrl: string, storagePath: string): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready
    .then((reg) => reg.active?.postMessage({ type: 'CACHE_DOCUMENTO', signedUrl, storagePath }))
    .catch(() => undefined)
}

/**
 * Get a signed URL for a document (valid for 1 hour).
 * Pass `download` (filename) to get a Content-Disposition: attachment URL for browser download.
 * Inline URLs are cached per storage path; download URLs are never cached.
 */
export function useDocumentoUrl() {
  return useMutation({
    mutationFn: async ({
      storagePath,
      download,
    }: {
      storagePath: string
      tipoArquivo?: string
      download?: string
    }) => {
      // Fast path: return cached inline URL (skip if requesting attachment)
      if (!download) {
        const cached = peekDocumentoUrl(storagePath)
        if (cached) return cached
      }

      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(storagePath, 3600, download ? { download } : undefined)
      if (error) throw error
      if (!data?.signedUrl) throw new Error('URL assinada não disponível')

      // Cache only inline URLs
      if (!download) {
        signedUrlCache.set(storagePath, {
          url: data.signedUrl,
          expiresAt: Date.now() + CACHE_TTL_MS,
        })
        // Async: tell the SW to fetch and cache the file for offline access.
        // Fire-and-forget — never blocks the UI.
        notifySwToCache(data.signedUrl, storagePath)
      }

      return data.signedUrl
    },
  })
}

/**
 * Pré-cacheia todos os documentos da lista para acesso offline,
 * independente de o usuário ter aberto cada arquivo.
 *
 * Estratégia:
 * - Usa `createSignedUrls` (batch) — 1 req para N arquivos.
 * - Envia `PREFETCH_DOCUMENTOS` ao SW com todos os paths + URLs.
 * - O SW ignora arquivos já cacheados (idempotente).
 * - Só executa quando online; re-executa quando a lista muda.
 * - Não bloqueia a UI (useEffect + fire-and-forget).
 */
export function usePrefetchDocumentosOffline(storagePaths: string[]): void {
  // Use ref to track which paths have already been dispatched this session
  // so we don't re-send paths that are already cached.
  const dispatchedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (
      storagePaths.length === 0 ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return
    }

    // Filter out paths already dispatched in this session.
    const newPaths = storagePaths.filter((p) => !dispatchedRef.current.has(p))
    if (newPaths.length === 0) return

    // Mark as dispatched immediately to prevent duplicate calls
    // even if the effect re-runs before the async work completes.
    for (const p of newPaths) dispatchedRef.current.add(p)

    const prefetch = async () => {
      // Only prefetch when online — offline, the cache is the source of truth.
      if (!navigator.onLine) return

      const sw = await navigator.serviceWorker.ready.catch(() => null)
      if (!sw?.active) return

      // Batch-generate signed URLs (1 Supabase request for all paths).
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrls(newPaths, 3600)

      if (error || !data) return

      const items = data
        .filter((entry) => !entry.error && entry.signedUrl)
        .map((entry) => ({
          signedUrl: entry.signedUrl as string,
          storagePath: entry.path,
        }))

      if (items.length === 0) return

      sw.active.postMessage({ type: 'PREFETCH_DOCUMENTOS', items })
    }

    prefetch().catch(() => undefined)
  }, [storagePaths])
}
