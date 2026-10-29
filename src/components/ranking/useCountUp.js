"use client";

import { useEffect, useState } from "react";

/** Cuenta desde `from` hasta `to` con desaceleración, como un marcador que se asienta. */
export function useCountUp(to, { from = 0, duration = 1400, delay = 0 } = {}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, from, duration, delay]);
  return value;
}
