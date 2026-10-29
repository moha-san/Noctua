"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | null = null;

/** Cliente único de Supabase (solo en el navegador). */
export function sb(): SupabaseClient | null {
  if (typeof window === "undefined" || !SUPABASE_URL || !SUPABASE_KEY) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "athenaeum-auth" } });
  return client;
}

export const backendConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export type Profile = {
  id: string;
  username: string;
  country: string;
  rating: number;
  games: number;
  status: "aspirante" | "pendiente" | "miembro" | "rechazado";
  waitlist_number: number | null;
  invites_left: number;
};

/** Llama a una función del servidor y devuelve su resultado o lanza un Error legible. */
export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const c = sb();
  if (!c) throw new Error("El servidor no está configurado");
  const { data, error } = await c.rpc(fn, args);
  if (error) throw new Error(friendly(error.message));
  return data as T;
}

/** Traduce errores técnicos frecuentes a mensajes claros. */
export function friendly(msg: string) {
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
  if (/Invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
  if (/User already registered/i.test(msg)) return "Ya existe una cuenta con ese correo.";
  if (/Password should be at least/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/Email not confirmed/i.test(msg)) return "Confirma tu correo antes de entrar (revisa tu bandeja de entrada).";
  if (/rate limit/i.test(msg)) return "Demasiados intentos. Espera un minuto y vuelve a probar.";
  if (/function .* does not exist|Could not find the function/i.test(msg)) return "El servidor todavía no está instalado (falta ejecutar instalar.sql en Supabase).";
  return msg;
}
