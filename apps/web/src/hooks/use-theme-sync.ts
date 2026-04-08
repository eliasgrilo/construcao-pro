import { useUpdateUserPreference, useUserPreference } from '@/hooks/use-supabase'
import { useUIStore } from '@/stores/ui-store'
import { useEffect, useRef } from 'react'

/**
 * Syncs the UI theme between Zustand (localStorage) and Supabase (cloud).
 * Cloud is the source of truth: whenever cloud value changes (including from
 * other devices via realtime), the local theme is updated to match.
 * On user change, the theme is saved to both localStorage (via Zustand) and cloud.
 */
export function useThemeCloudSync() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const { data: cloudTheme, isSuccess: cloudLoaded } = useUserPreference('theme')
  const { mutate: saveThemeCloud } = useUpdateUserPreference('theme')
  const hasInitialized = useRef(false)
  const lastCloudSync = useRef<string>(theme)
  const isLocalChange = useRef(false)

  // Apply cloud theme whenever it changes (first load + cross-device updates)
  useEffect(() => {
    if (!cloudLoaded) return
    if (!cloudTheme || cloudTheme === '') {
      lastCloudSync.current = ''
      hasInitialized.current = true
      return
    }
    // Skip if this change originated from a local setTheme (avoid loop)
    if (isLocalChange.current) {
      isLocalChange.current = false
      hasInitialized.current = true
      return
    }
    hasInitialized.current = true
    lastCloudSync.current = cloudTheme
    if (cloudTheme !== theme) {
      setTheme(cloudTheme as 'light' | 'dark' | 'system')
    }
  }, [cloudLoaded, cloudTheme, theme, setTheme])

  // When theme changes locally (user interaction), persist to cloud
  useEffect(() => {
    if (!cloudLoaded || !hasInitialized.current) return
    if (theme === lastCloudSync.current) return
    const previousSync = lastCloudSync.current
    lastCloudSync.current = theme
    isLocalChange.current = true
    saveThemeCloud(theme, {
      onError: () => {
        lastCloudSync.current = previousSync
        isLocalChange.current = false
      },
    })
  }, [cloudLoaded, theme, saveThemeCloud])
}
