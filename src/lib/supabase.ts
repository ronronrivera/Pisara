import { createClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from './env'

if (!isSupabaseConfigured) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(env.supabaseUrl!, env.supabaseAnonKey!)
