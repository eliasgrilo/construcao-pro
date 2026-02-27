import type { Database } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[ConstruçãoPro] Variáveis de ambiente ausentes: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.',
  )
}

let _client: ReturnType<typeof createClient<Database>>

try {
  _client = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '')
} catch {
  // Fallback: variáveis de ambiente não configuradas
  _client = createClient<Database>('https://placeholder.supabase.co', 'placeholder-key')
}

export const supabase = _client
