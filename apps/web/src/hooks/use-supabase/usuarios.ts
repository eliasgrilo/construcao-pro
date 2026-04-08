import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Database } from '@/types/database'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════
// Usuarios (Admin)
// ═══════════════════════════════════════════════════════════

type UsuarioRow = Database['public']['Tables']['usuarios']['Row']
type UsuarioObraRow = Database['public']['Tables']['usuario_obras']['Row']
type UsuarioQueryRow = UsuarioRow & {
  usuario_obras: Array<{
    obra_id: UsuarioObraRow['obra_id']
    obras: { id: string; nome: string } | null
  }> | null
}

export interface UsuarioWithObras extends UsuarioRow {
  obras: { id: string; nome: string }[]
}

function mapUsuarioWithObras(row: UsuarioQueryRow): UsuarioWithObras {
  const { usuario_obras, ...usuario } = row
  return {
    ...usuario,
    obras: (usuario_obras ?? []).flatMap((usuarioObra) =>
      usuarioObra.obras ? [usuarioObra.obras] : [],
    ),
  }
}

function refreshCurrentUserIfNeeded(usuarioId: string) {
  const { user, loadProfile } = useAuthStore.getState()
  if (user?.id === usuarioId) {
    void loadProfile(undefined, { forceRefresh: true })
  }
}

export function useUsuarios() {
  return useQuery<UsuarioWithObras[]>({
    queryKey: queryKeys.usuarios.all(),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, usuario_obras(obra_id, obras(id, nome))')
        .order('created_at', { ascending: false })
        .overrideTypes<UsuarioQueryRow[]>()
      if (error) throw error
      return (data ?? []).map(mapUsuarioWithObras)
    },
  })
}

export function useUpdateUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      nome,
      role,
      ativo,
    }: { id: string; nome: string; role: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('usuarios')
        .update({ nome, role: role as UsuarioRow['role'], ativo })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.usuarios.all() })
      refreshCurrentUserIfNeeded(vars.id)
    },
  })
}

export function useSetUsuarioObras() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ usuarioId, obraIds }: { usuarioId: string; obraIds: string[] }) => {
      // Atomic RPC: delete + insert in a single DB transaction.
      // Prevents the user from losing all obra access if the insert step fails.
      const { error } = await supabase.rpc('set_usuario_obras', {
        p_usuario_id: usuarioId,
        p_obra_ids: obraIds,
      })
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.usuarios.all() })
      refreshCurrentUserIfNeeded(vars.usuarioId)
    },
  })
}

export function useUpdateUsuarioWithObras() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      nome,
      role,
      ativo,
      obraIds,
    }: {
      id: string
      nome: string
      role: string
      ativo: boolean
      obraIds: string[]
    }) => {
      const { error } = await supabase.rpc('update_usuario_with_obras', {
        p_usuario_id: id,
        p_nome: nome,
        p_role: role as UsuarioRow['role'],
        p_ativo: ativo,
        p_obra_ids: obraIds,
      })
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.usuarios.all() })
      refreshCurrentUserIfNeeded(vars.id)
    },
  })
}
