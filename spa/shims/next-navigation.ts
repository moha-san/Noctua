import { toHash, useRoute } from "./router";

export function usePathname() {
  return useRoute().path;
}
export function redirect(to: string) {
  window.location.hash = toHash(to);
}
