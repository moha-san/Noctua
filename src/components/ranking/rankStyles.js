/**
 * Jerarquía visual de los rangos (ids internos → nombre visible):
 * iniciado (Principiante) e academico (Intermedio) → sobrios, piedra y pergamino.
 * erudito (Avanzado) → nogal. maestro (Experto) → oro viejo.
 * arquitecto (Maestro) → doble borde dorado. iluminado (Élite, Top 10) → dorado con brillo.
 */

// Texto bañado en oro (se adapta al tema Nocturno)
export const GOLD_TEXT =
  "bg-gradient-to-r from-[#7a5a26] via-[#c9a45c] to-[#7a5a26] bg-[length:200%_auto] bg-clip-text text-transparent dark:from-[#b8914a] dark:via-[#f4dc9c] dark:to-[#b8914a]";

// Degradado de la barra de progreso: bronce oscuro → oro brillante
export const BRONZE_TO_GOLD = "bg-gradient-to-r from-[#4a3019] via-[#9a6e35] to-[#f2d98f]";

export const RANK_STYLES = {
  iniciado: {
    name: "font-sans font-medium text-ink-2",
    chip: "border border-line bg-paper-3 text-ink-3",
    avatar: "border border-line bg-paper-3 text-ink-3 font-sans",
    row: "",
    seal: "from-paper-3 to-paper-4 text-ink-3 ring-1 ring-line",
    glow: false,
  },
  academico: {
    name: "font-serif text-[16px] text-ink",
    chip: "border border-paper-4 bg-paper-2 text-ink-2",
    avatar: "border border-ink-4/50 bg-paper-2 text-ink-2 font-serif shadow-inner",
    row: "",
    seal: "from-paper-2 to-paper-4 text-ink-2 ring-1 ring-ink-4/40",
    glow: false,
  },
  erudito: {
    name: "font-serif text-[16.5px] font-medium text-wood dark:text-[#d9b98a]",
    chip: "border border-wood/40 bg-wood/[0.07] text-wood dark:border-[#d9b98a]/40 dark:text-[#d9b98a]",
    avatar: "border-2 border-wood/60 bg-paper-2 text-wood font-serif shadow-inner dark:border-[#d9b98a]/60 dark:text-[#d9b98a]",
    row: "",
    seal: "from-[#8a5d36] to-[#4e321d] text-[#f3e3c6] ring-1 ring-[#3a2414]/40",
    glow: false,
  },
  maestro: {
    name: "font-serif text-[17px] italic font-medium text-ink",
    chip: "border border-gold/70 bg-gold/10 text-gold shadow-[0_0_12px_-4px_rgb(var(--gold)/0.6)]",
    avatar: "border-2 border-gold/80 bg-paper text-gold font-serif shadow-[0_0_0_3px_rgb(var(--paper)),0_0_0_4px_rgb(var(--gold)/0.35)]",
    row: "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-gold/70",
    seal: "from-[#d9b56a] via-[#a07a34] to-[#6b4b1e] text-[#fff6e0] ring-1 ring-gold/60",
    glow: false,
  },
  arquitecto: {
    name: `font-serif text-[16px] font-semibold ${GOLD_TEXT}`,
    chip: "border-[3px] border-double border-gold bg-gradient-to-b from-gold/15 to-gold/5 text-gold",
    avatar: "border-[3px] border-double border-gold bg-gradient-to-b from-paper to-paper-3 text-gold font-serif shadow-glow",
    row: "bg-gradient-to-r from-gold/[0.07] via-transparent to-transparent before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-r before:bg-gold",
    seal: "from-[#f3dc9a] via-[#c9a45c] to-[#7a5a26] text-[#2b1d0e] ring-2 ring-gold shadow-glow",
    glow: true,
  },
  iluminado: {
    name: `font-serif text-[16.5px] font-bold drop-shadow-[0_0_8px_rgb(var(--gold)/0.35)] ${GOLD_TEXT}`,
    chip: "border-[3px] border-double border-[#f3dc9a] bg-gradient-to-b from-[#e8c879] to-[#a07a34] text-[#2b1d0e] shadow-glow",
    avatar: "border-[3px] border-double border-gold bg-gradient-to-b from-[#fbefd0] to-[#e3c785] text-[#3a2812] font-serif shadow-[0_0_0_2px_rgb(var(--paper)),0_0_24px_2px_rgb(var(--gold)/0.55)]",
    row: "bg-gradient-to-r from-gold/[0.14] via-gold/[0.04] to-transparent shadow-[inset_0_0_0_1px_rgb(var(--gold)/0.25)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-r before:bg-gradient-to-b before:from-[#f3dc9a] before:to-gold",
    seal: "from-[#fff3cf] via-[#e3bf6e] to-[#8a6a2a] text-[#2b1d0e] ring-2 ring-[#f3dc9a] shadow-[0_0_30px_4px_rgb(var(--gold)/0.5)]",
    glow: true,
  },
};
