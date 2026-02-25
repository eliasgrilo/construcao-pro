import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
    theme: Theme
    sidebarOpen: boolean
    sidebarCollapsed: boolean
    mobileMenuOpen: boolean
    setTheme: (theme: Theme) => void
    toggleSidebar: () => void
    setSidebarCollapsed: (collapsed: boolean) => void
    setMobileMenuOpen: (open: boolean) => void
}

function resolveTheme(theme: Theme): boolean {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme) {
    const isDark = resolveTheme(theme)
    document.documentElement.classList.toggle('dark', isDark)
    // Set meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', isDark ? '#000000' : '#f5f5f7')
}

// Listen for system theme changes when in "system" mode
let systemThemeListener: (() => void) | null = null

function setupSystemThemeListener(currentTheme: Theme) {
    // Clean up previous listener
    if (systemThemeListener) {
        systemThemeListener()
        systemThemeListener = null
    }

    if (currentTheme === 'system') {
        const mql = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => applyTheme('system')
        mql.addEventListener('change', handler)
        systemThemeListener = () => mql.removeEventListener('change', handler)
    }
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            theme: 'dark',
            sidebarOpen: true,
            sidebarCollapsed: false,
            mobileMenuOpen: false,

            setTheme: (theme) => {
                applyTheme(theme)
                setupSystemThemeListener(theme)
                set({ theme })
            },

            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

            setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    applyTheme(state.theme)
                    setupSystemThemeListener(state.theme)
                }
            },
        },
    ),
)
