/**
 * Conexión con Supabase. La clave "publishable" es pública por diseño:
 * la seguridad la ponen las reglas (RLS) y las funciones de supabase/schema.sql.
 * Nunca pongas aquí la clave secreta (sb_secret_… / service_role).
 */
export const SUPABASE_URL = "https://crewdolhabtyzksfkfpt.supabase.co";
export const SUPABASE_KEY = "sb_publishable_0qakZpZI7SXAbepTfO4hmA_PeHCVuTO";
