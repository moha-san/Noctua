"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { friendly, sb, type Profile } from "@/lib/backend/client";

const EVENT = "athenaeum-profile";

/** Sesión de Supabase + perfil del club. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    const c = sb();
    if (!c || !uid) return setProfile(null);
    const { data } = await c.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    const c = sb();
    if (!c) return setLoading(false);
    c.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user.id).finally(() => setLoading(false));
    });
    const { data: sub } = c.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadProfile(s?.user.id);
    });
    const refresh = () => c.auth.getSession().then(({ data }) => loadProfile(data.session?.user.id));
    window.addEventListener(EVENT, refresh);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener(EVENT, refresh);
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await sb()!.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error.message));
  };
  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await sb()!.auth.signUp({ email, password, options: { data: { username } } });
    if (error) throw new Error(friendly(error.message));
    return { needsConfirmation: !data.session };
  };
  const signOut = async () => {
    await sb()?.auth.signOut();
  };

  return { session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut };
}

/** Pide a todos los componentes que recarguen el perfil (tras cambiar el Elo, etc.). */
export const refreshProfile = () => window.dispatchEvent(new Event(EVENT));
