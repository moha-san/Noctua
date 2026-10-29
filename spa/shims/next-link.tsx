import type { AnchorHTMLAttributes } from "react";
import { toHash } from "./router";

/** Sustituto de next/link: navega cambiando el hash. */
export default function Link({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={toHash(href)} {...props} />;
}
