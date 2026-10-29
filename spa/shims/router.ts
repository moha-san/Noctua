import { useSyncExternalStore } from "react";

/**
 * Enrutado por hash con nombres simples (#review, #review-g2, #puzzles-p5),
 * que funcionan también dentro de visores que solo aceptan "#nombre".
 */
export function toHash(href: string) {
  const [path, query = ""] = href.split("?");
  const name = path.replace(/^\//, "") || "dashboard";
  const p = new URLSearchParams(query);
  const extra = p.get("game") ?? p.get("id");
  return `#${name}${extra ? `-${encodeURIComponent(extra)}` : ""}`;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const getHash = () => window.location.hash.slice(1) || "dashboard";

export function useRoute() {
  const raw = useSyncExternalStore(subscribe, getHash, () => "dashboard");
  // Solo el primer guion separa la sección del dato (un nombre de usuario puede llevar guiones)
  const i = raw.indexOf("-");
  const name = i < 0 ? raw : raw.slice(0, i);
  const extra = i < 0 ? null : decodeURIComponent(raw.slice(i + 1));
  return { path: `/${name}`, extra };
}
