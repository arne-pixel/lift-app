import { createClient } from '@supabase/supabase-js'

export const OWNER_ID = '1fc53aa6-ba64-43ed-a08b-382b4330ca80'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
