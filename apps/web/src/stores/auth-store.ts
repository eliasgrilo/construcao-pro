import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'

export type Role = 'ADMIN' | 'GESTOR' | 'ALMOXARIFE' | 'VISUALIZADOR'

interface User {
  id: string
  nome: string
  email: string
  role: Role
  /** Obra IDs this user is assigned to (from usuario_obras). Empty = no assignment. */
  obraIds: string[]
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadProfile: (
    session?: Session | null,
    options?: {
      forceRefresh?: boolean
    },
  ) => Promise<void>
  updateProfile: (fields: { nome: string }) => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

// ─── Profile cache ───────────────────────────────────────────────────────────
// Persisted to localStorage so we can restore the user synchronously on next
// launch — eliminates the full-screen auth spinner for returning users.

const CACHE_KEY = 'cpro_user'
// Increment this version when the User shape changes to force a cache bust
// on existing clients (e.g. new required field, renamed field, type change).
const CACHE_VERSION = 2

interface CacheEnvelope {
  v: number
  user: User
}

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const envelope = JSON.parse(raw) as unknown
    // Invalidate stale cache from older schema versions
    if (
      !envelope ||
      typeof envelope !== 'object' ||
      (envelope as CacheEnvelope).v !== CACHE_VERSION
    ) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return (envelope as CacheEnvelope).user
  } catch {
    return null
  }
}

function writeCachedUser(user: User | null) {
  try {
    if (user) {
      const envelope: CacheEnvelope = { v: CACHE_VERSION, user }
      localStorage.setItem(CACHE_KEY, JSON.stringify(envelope))
    } else {
      localStorage.removeItem(CACHE_KEY)
    }
  } catch {
    // Ignore — may fail in private browsing with restricted storage
  }
}

function sameUserSnapshot(a: User | null, b: User | null) {
  if (a === b) return true
  if (!a || !b) return false
  if (a.id !== b.id || a.nome !== b.nome || a.email !== b.email || a.role !== b.role) return false
  if (a.obraIds.length !== b.obraIds.length) return false
  return a.obraIds.every((obraId, index) => obraId === b.obraIds[index])
}

// Synchronously restore cache before the store is created so the initial state
// already has the user and isLoading:false — React renders the app immediately
// on repeat visits with no visible spinner.
const cachedUser = readCachedUser()

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: cachedUser,
  isAuthenticated: !!cachedUser,
  // Only block with a spinner when there is no cache to show optimistically.
  isLoading: !cachedUser,

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    // Pass session directly — avoids a redundant getSession() call inside loadProfile
    await get().loadProfile(data.session, { forceRefresh: true })
  },

  logout: async () => {
    await supabase.auth.signOut()
    writeCachedUser(null)
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  // `session` is supplied by onAuthStateChange (avoids an extra getSession() round-trip).
  // When called without a session (e.g. direct login flow) it falls back to getSession().
  loadProfile: async (session?: Session | null, options?: { forceRefresh?: boolean }) => {
    // Don't flash the loading spinner when we already have a cached user to show.
    if (!get().user) {
      set({ isLoading: true })
    }

    const resolvedSession =
      session !== undefined ? session : (await supabase.auth.getSession()).data.session

    if (!resolvedSession?.user) {
      writeCachedUser(null)
      set({ user: null, isAuthenticated: false, isLoading: false })
      return
    }

    // When we already have cached UI, only skip the DB round-trip if the caller
    // explicitly allows stale profile data for the same authenticated user.
    const currentUser = get().user
    if (!options?.forceRefresh && currentUser?.id === resolvedSession.user.id) {
      set({ isLoading: false })
      return
    }

    const [profileResult, obrasResult] = await Promise.all([
      supabase
        .from('usuarios')
        .select('id, nome, email, role')
        .eq('id', resolvedSession.user.id)
        .single(),
      supabase.from('usuario_obras').select('obra_id').eq('usuario_id', resolvedSession.user.id),
    ])

    if (profileResult.error || !profileResult.data) {
      writeCachedUser(null)
      set({ user: null, isAuthenticated: false, isLoading: false })
      return
    }

    const profile = profileResult.data
    const obraIds = (obrasResult.data ?? []).map((r) => r.obra_id).sort()

    const user: User = {
      id: profile.id,
      nome: profile.nome,
      email: profile.email,
      role: profile.role as Role,
      obraIds,
    }

    if (!sameUserSnapshot(currentUser, user)) {
      writeCachedUser(user)
      set({ user, isAuthenticated: true, isLoading: false })
      // Role or obra assignments changed — all queries may return different data
      // for the new permissions. Invalidate everything so no stale data leaks.
      queryClient.invalidateQueries()
      return
    }

    set({ isAuthenticated: true, isLoading: false })
  },

  updateProfile: async (fields) => {
    const current = get().user
    if (!current) throw new Error('Usuário não autenticado')

    const { error } = await supabase
      .from('usuarios')
      .update({ nome: fields.nome })
      .eq('id', current.id)

    if (error) throw new Error(error.message)

    const updated: User = { ...current, nome: fields.nome }
    writeCachedUser(updated)
    set({ user: updated })
  },

  setUser: (user) => {
    writeCachedUser(user)
    set({ user, isAuthenticated: !!user })
  },
  setLoading: (isLoading) => set({ isLoading }),
}))
