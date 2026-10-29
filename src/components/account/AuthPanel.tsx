"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, UserPlus, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";

const STATUS = { aspirante: "Aspirante", pendiente: "Prueba superada · pendiente de revisión", miembro: "Miembro del club", rechazado: "Solicitud rechazada" } as const;

/** Iniciar sesión / crear cuenta. Si ya hay sesión, muestra la cuenta. */
export function AuthPanel({ title = "Tu cuenta del club", compact = false }: { title?: string; compact?: boolean }) {
  const { user, profile, loading, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (loading) return <div className={cn("card p-7 text-[14px] text-ink-4", compact && "p-5")}>Comprobando la sesión…</div>;

  if (user)
    return (
      <div className={cn("card flex flex-wrap items-center justify-between gap-4 p-7", compact && "p-5")}>
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/50 bg-paper-2 font-serif text-[20px] text-ink">{(profile?.username ?? "?")[0].toUpperCase()}</span>
          <div>
            <p className="font-serif text-[19px] text-ink">{profile?.username ?? user.email}</p>
            <p className="text-[13px] text-ink-3">{profile ? `${STATUS[profile.status]} · Elo online ${profile.rating}` : user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile && <Link href={`/profile?id=${encodeURIComponent(profile.username)}`} className="btn-ghost"><UserRound className="h-4 w-4" /> Mi perfil</Link>}
          <button className="btn-ghost" onClick={() => signOut()}><LogOut className="h-4 w-4" /> Cerrar sesión</button>
        </div>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") await signIn(email.trim(), password);
      else {
        if (username.trim().length < 3) throw new Error("El nombre de usuario debe tener al menos 3 caracteres.");
        const r = await signUp(email.trim(), password, username.trim());
        if (r.needsConfirmation) setMsg({ ok: true, text: "Cuenta creada. Revisa tu correo para confirmarla y después entra." });
      }
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const input = "mt-2 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[15px] text-ink outline-none transition focus:border-gold";
  return (
    <form onSubmit={submit} className={cn("card p-7", compact && "p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-serif text-[22px] text-ink">{title}</p>
        <div className="flex rounded-full border border-line bg-paper-2 p-1 text-[13px]">
          {([["in", "Entrar"], ["up", "Crear cuenta"]] as const).map(([k, l]) => (
            <button type="button" key={k} onClick={() => setMode(k)} className={cn("rounded-full px-4 py-1.5 transition", mode === k ? "bg-paper text-ink shadow-card" : "text-ink-4 hover:text-ink-2")}>{l}</button>
          ))}
        </div>
      </div>
      <div className={cn("mt-5 grid gap-4", mode === "up" ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {mode === "up" && (
          <label className="block"><span className="label">Nombre de usuario</span><input className={input} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} autoComplete="username" required /></label>
        )}
        <label className="block"><span className="label">Correo</span><input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label className="block"><span className="label">Contraseña</span><input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} required /></label>
      </div>
      {msg && <p className={cn("mt-4 text-[14px]", msg.ok ? "text-good" : "text-bad")} role="alert">{msg.text}</p>}
      <button className="btn-primary mt-5 px-7 py-3" disabled={busy}>{mode === "in" ? <><LogIn className="h-4 w-4" /> Entrar</> : <><UserPlus className="h-4 w-4" /> Crear cuenta</>}</button>
    </form>
  );
}
