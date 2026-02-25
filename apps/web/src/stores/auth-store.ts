import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type Role = 'ADMIN' | 'GESTOR' | 'ALMOXARIFE' | 'VISUALIZADOR'

interface User {
    id: string
    nome: string
    email: string
    role: Role
}

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    loadProfile: () => Promise<void>
    setUser: (user: User | null) => void
    setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
        await get().loadProfile()
    },

    logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false })
    },

    loadProfile: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
            set({ user: null, isAuthenticated: false, isLoading: false })
            return
        }

        const { data: profile } = await supabase
            .from('usuarios')
            .select('id, nome, email, role')
            .eq('id', session.user.id)
            .single()

        if (profile) {
            set({
                user: {
                    id: profile.id,
                    nome: profile.nome,
                    email: profile.email,
                    role: profile.role as Role,
                },
                isAuthenticated: true,
                isLoading: false,
            })
        } else {
            set({ user: null, isAuthenticated: false, isLoading: false })
        }
    },

    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setLoading: (isLoading) => set({ isLoading }),
}))
