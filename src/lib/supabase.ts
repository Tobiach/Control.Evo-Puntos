import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Null-safe: sin env vars configuradas, el sistema sigue funcionando 100% sobre los
// datos mock de src/data/. El día que se conecte un proyecto real, agregar las dos
// env vars alcanza para migrar — ningún componente necesita reescribirse.
export const supabaseEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = supabaseEnabled ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!) : null;
