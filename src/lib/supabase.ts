import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://nao-configurado.supabase.co',
  supabaseAnonKey || 'nao-configurado',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}
