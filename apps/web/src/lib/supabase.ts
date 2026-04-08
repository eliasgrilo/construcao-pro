import type { Database } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// In test environments (vitest) env vars may be absent — use placeholder so the
// module can be imported without throwing. In all other environments a missing
// var is a hard error that must be fixed before the app can run.
const isTestEnv = import.meta.env.MODE === 'test'

if (!supabaseUrl || !supabaseAnonKey) {
  if (!isTestEnv) {
    throw new Error(
      'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
        'Verifique seu arquivo .env.local',
    )
  }
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    realtime: {
      params: {
        heartbeat_interval: 15,
      },
    },
  },
)
