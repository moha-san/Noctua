/** Mini-libro de aperturas (secuencias SAN). Ampliable con un ECO completo. */
export const OPENINGS: { name: string; moves: string[] }[] = [
  { name: "Apertura Española (Ruy López)", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"] },
  { name: "Defensa Philidor", moves: ["e4", "e5", "Nf3", "d6", "d4", "Bg4"] },
  { name: "Defensa Petrov", moves: ["e4", "e5", "Nf3", "Nf6", "Nxe5", "d6", "Nf3", "Nxe4"] },
  { name: "Apertura Escocesa", moves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"] },
  { name: "Giuoco Piano", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3"] },
  { name: "Defensa Siciliana Najdorf", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"] },
  { name: "Defensa Francesa", moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "Bg5"] },
  { name: "Caro-Kann", moves: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5"] },
  { name: "Gambito de Dama Rehusado", moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7"] },
  { name: "Defensa India de Rey", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6"] },
  { name: "Apertura Inglesa", moves: ["c4", "e5", "Nc3", "Nf6", "g3", "d5"] },
  { name: "Sistema Londres", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "c5"] },
  { name: "Defensa Escandinava", moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5"] },
];

/** Devuelve cuántas jugadas iniciales coinciden con alguna línea del libro y su nombre. */
export function detectOpening(sanMoves: string[]): { name: string | null; bookPlies: number } {
  let best = { name: null as string | null, bookPlies: 0 };
  for (const o of OPENINGS) {
    let i = 0;
    while (i < o.moves.length && i < sanMoves.length && o.moves[i] === sanMoves[i]) i++;
    if (i > best.bookPlies) best = { name: o.name, bookPlies: i };
  }
  // Con menos de 4 jugadas comunes no se puede afirmar qué apertura es
  if (best.bookPlies < 4) best.name = null;
  return best;
}
