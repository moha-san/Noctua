export const USER = {
  name: "Moha",
  handle: "@moha",
  avatar: "M",
  country: "🇪🇸",
  ratings: { rapid: 1487, blitz: 1392, bullet: 1265, puzzles: 1820 },
  delta: { rapid: +34, blitz: -12, bullet: +8, puzzles: +56 },
  stats: { games: 412, wins: 214, draws: 31, losses: 167, streak: 4, accuracy: 81.6 },
};

/** Historial de ELO (rápidas) de los últimos 30 días. */
export const ELO_HISTORY = Array.from({ length: 30 }, (_, i) => {
  const base = 1400 + i * 3;
  const noise = Math.round(Math.sin(i * 1.3) * 18 + Math.cos(i * 0.7) * 11);
  const d = new Date(2026, 9, i);
  return { day: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }), rapid: base + noise, blitz: base - 70 + Math.round(Math.cos(i) * 22) };
});

export const OPERA_GAME_PGN = `[Event "Paris"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

export type RecentGame = {
  id: string;
  opponent: string;
  opponentRating: number;
  color: "w" | "b";
  result: "win" | "loss" | "draw";
  timeControl: "Rápida" | "Blitz" | "Bala";
  accuracy: number;
  moves: number;
  date: string;
  opening: string;
  pgn: string;
};

export const RECENT_GAMES: RecentGame[] = [
  { id: "g1", opponent: "Duque de Brunswick", opponentRating: 1502, color: "w", result: "win", timeControl: "Rápida", accuracy: 92.4, moves: 17, date: "Hoy", opening: "Defensa Philidor", pgn: OPERA_GAME_PGN },
  { id: "g2", opponent: "Lucía Fernández", opponentRating: 1455, color: "b", result: "loss", timeControl: "Blitz", accuracy: 71.2, moves: 19, date: "Hoy", opening: "Siciliana Najdorf", pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7 11. g4 b5 12. g5 b4 13. Ne2 Ne8 14. f4 a5 15. f5 Bxb3 16. cxb3 a4 17. Kb1 axb3 18. axb3 Nc5 19. Ng3 Qa5 0-1" },
  { id: "g3", opponent: "Marcos Ruiz", opponentRating: 1390, color: "w", result: "win", timeControl: "Rápida", accuracy: 84.9, moves: 41, date: "Ayer", opening: "Gambito de Dama", pgn: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4 1-0" },
  { id: "g4", opponent: "Ana Torres", opponentRating: 1478, color: "b", result: "draw", timeControl: "Rápida", accuracy: 88.1, moves: 20, date: "Ayer", opening: "Caro-Kann", pgn: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 8. h5 Bh7 9. Bd3 Bxd3 10. Qxd3 e6 11. Bd2 Ngf6 12. O-O-O Be7 13. Kb1 O-O 14. Ne4 Nxe4 15. Qxe4 Nf6 16. Qe2 Qd5 17. Ne5 Qe4 18. Qxe4 Nxe4 19. Be3 Rfd8 20. g4 1/2-1/2" },
  { id: "g5", opponent: "Diego Navarro", opponentRating: 1410, color: "w", result: "loss", timeControl: "Bala", accuracy: 63.5, moves: 20, date: "27 oct", opening: "Apertura Inglesa", pgn: "1. c4 e5 2. Nc3 Nf6 3. g3 d5 4. cxd5 Nxd5 5. Bg2 Nb6 6. Nf3 Nc6 7. O-O Be7 8. d3 O-O 9. Be3 Be6 10. Rc1 f5 11. Na4 Nxa4 12. Qxa4 Bd5 13. Bc5 e4 14. dxe4 fxe4 15. Nd4 Nxd4 16. Bxd4 c6 17. Rfd1 Qe8 18. Qb3 Kh8 19. Bc3 Bf6 20. Bxf6 Rxf6 0-1" },
];

export const ACHIEVEMENTS = [
  { label: "Racha de victorias", value: "4", hint: "Mejor: 9" },
  { label: "Problemas hoy", value: "12", hint: "Objetivo: 15" },
  { label: "Precisión media", value: "81.6%", hint: "+2.1 esta semana" },
];
