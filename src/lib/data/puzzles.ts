export type Puzzle = {
  id: string;
  title: string;
  theme: string;
  rating: number;
  fen: string;
  /** Jugadas en SAN alternando jugador / rival. El jugador siempre empieza. */
  solution: string[];
};

export const PUZZLES: Puzzle[] = [
  { id: "p1", title: "Mate del pasillo", theme: "Mate en 1", rating: 600, fen: "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", solution: ["Rd8#"] },
  { id: "p2", title: "El mate del pastor", theme: "Mate en 1", rating: 450, fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", solution: ["Qxf7#"] },
  { id: "p3", title: "Mate de la coz", theme: "Mate en 1", rating: 900, fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", solution: ["Nf7#"] },
  { id: "p4", title: "Horquilla real", theme: "Doble ataque", rating: 1050, fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1", solution: ["Nc7+", "Kd8", "Nxa8"] },
  { id: "p5", title: "La escalera", theme: "Mate en 2", rating: 1200, fen: "7k/8/8/8/8/8/1R6/R5K1 w - - 0 1", solution: ["Ra7", "Kg8", "Rb8#"] },
  { id: "p6", title: "Primera fila débil", theme: "Mate en 1", rating: 650, fen: "3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1", solution: ["Rd1#"] },
  // Generados de partidas y verificados con Stockfish 19 (jugada única en cada paso)
  { id: "g1", title: "Problema 7", theme: "Mate en 1", rating: 510, fen: "5k1r/2pQ4/p5p1/5P1p/p4P2/PP1P2P1/2P4P/R1B1R1K1 w - - 0 29", solution: ["Re8#"] },
  { id: "g2", title: "Problema 8", theme: "Mate en 1", rating: 530, fen: "2k3r1/pp2pp1p/3Bb3/q7/3nn3/1P3P2/P1Pb2PP/1R1K1B1R b - - 3 19", solution: ["Nf2#"] },
  { id: "g3", title: "Problema 9", theme: "Mate en 1", rating: 540, fen: "2k4r/2p1n2p/1p3bp1/p4p2/2P1P3/3q1P1N/r2B2PP/2K3R1 b - - 0 30", solution: ["Qc2#"] },
  { id: "g4", title: "Problema 10", theme: "Mate en 1", rating: 550, fen: "B3k2r/7p/p2Qp3/4P3/5R2/6pP/PP2P3/4K1N1 w - - 3 30", solution: ["Bc6#"] },
  { id: "g5", title: "Problema 11", theme: "Mate en 1", rating: 560, fen: "2k4r/2p1n1bp/1p4p1/p4p2/2P5/3qPP1N/r2B2PP/2K3R1 b - - 0 29", solution: ["Qc2#"] },
  { id: "g6", title: "Problema 12", theme: "Mate en 1", rating: 620, fen: "7k/2p3r1/p5P1/8/5P1p/P2P2P1/1BP4P/1R2R1K1 w - - 0 36", solution: ["Re8#"] },
  { id: "g7", title: "Problema 13", theme: "Mate en 1", rating: 650, fen: "7k/2p3r1/p5P1/7p/3B1P2/P2P2P1/1pP4P/1R2R1K1 w - - 6 35", solution: ["Re8#"] },
  { id: "g8", title: "Problema 14", theme: "Mate en 1", rating: 660, fen: "5k1r/2pQ3p/p5p1/5P2/p4P2/1P1P2P1/P1P4P/R1B1R1K1 w - - 0 28", solution: ["Re8#"] },
  { id: "g9", title: "Problema 15", theme: "Mate en 1", rating: 670, fen: "7k/6r1/p1p3P1/8/5P1P/P2P4/1BP4P/1R2R1K1 w - - 0 37", solution: ["Re8#"] },
  { id: "g10", title: "Problema 16", theme: "Mate en 1", rating: 670, fen: "kn5r/r3Q2p/2p2p2/4p1pP/1PN1R1P1/P7/1B3P2/3RK3 w - - 1 35", solution: ["Nb6#"] },
  { id: "g11", title: "Problema 17", theme: "Mate en 1", rating: 680, fen: "rn1k1b1r/p3R2p/4p3/4P3/2Q3p1/4B2P/PP2PRB1/4K1N1 w - - 1 22", solution: ["Qc7#"] },
  { id: "g12", title: "Problema 18", theme: "Mate en 1", rating: 690, fen: "1n2k1nr/1pp2pp1/3bpq1p/3p4/7P/2NbP3/Q2P2P1/R1B1K1NR b k - 1 13", solution: ["Qf1#"] },
  { id: "g13", title: "Problema 19", theme: "Ganar material", rating: 900, fen: "2r5/4k3/4p3/7P/P1Np4/p1R4P/P6K/8 b - - 0 47", solution: ["dxc3"] },
  { id: "g14", title: "Problema 20", theme: "Ganar material", rating: 910, fen: "r1bqk2r/pp2bpp1/n3pn2/3P3p/3p2PP/2N5/PP2PPB1/R1BQK1NR b KQkq - 0 10", solution: ["dxc3"] },
  { id: "g15", title: "Problema 21", theme: "Ganar material", rating: 920, fen: "rnb1kb1r/1p5p/p2pp3/2pP3n/4pPPp/2N4P/PPPK2B1/R1B3NR w kq - 0 14", solution: ["gxh5"] },
  { id: "g16", title: "Problema 22", theme: "Ganar material", rating: 930, fen: "1k1r1bnr/p1pp1p1p/1pn1p3/8/P2PP3/2N2B2/1PPq1NP1/R2Q1KR1 w - - 1 16", solution: ["Qxd2"] },
  { id: "g17", title: "Problema 23", theme: "Ganar material", rating: 950, fen: "r4rk1/1p3pp1/4bn1B/pPb1p3/3q3P/2N2P2/PPQ3P1/2KR1B1R w - - 1 21", solution: ["Rxd4"] },
  { id: "g18", title: "Problema 24", theme: "Ganar material", rating: 1020, fen: "rnb1kb1r/p1pq1p1p/4pnp1/1p1p4/7B/3PP2N/PPP2PPP/RN1QKBR1 w Qkq - 2 7", solution: ["Bxf6"] },
  { id: "g19", title: "Problema 25", theme: "Ganar material", rating: 1040, fen: "rnbqkbr1/ppp1pp1p/6p1/8/4p3/2NP1N2/PPP2PPP/R1BQK2R b KQq - 0 7", solution: ["exf3"] },
  { id: "g20", title: "Problema 26", theme: "Ganar material", rating: 1040, fen: "3k4/p5p1/4p2p/5p2/2P1nP2/3P4/6P1/r1B1RK2 w - - 4 48", solution: ["dxe4"] },
  { id: "g21", title: "Problema 27", theme: "Ganar material", rating: 1050, fen: "2r1r1k1/6p1/1Rn1p3/8/p1b4P/P2PP3/2P2PP1/1N2K2R w - - 1 33", solution: ["dxc4"] },
  { id: "g22", title: "Problema 28", theme: "Ganar material", rating: 1050, fen: "rn2kbnr/pb2pppp/1p6/2pq4/8/PP5N/2PPBPPP/RNBQK2R b KQkq - 0 7", solution: ["Qxg2"] },
  { id: "g23", title: "Problema 29", theme: "Ganar material", rating: 1050, fen: "r1bqk3/p1p2nb1/2n3Qr/1p1pP2p/5PpP/P1P3P1/1P1NN3/R3KB1R b KQq - 2 15", solution: ["Rxg6"] },
  { id: "g24", title: "Problema 30", theme: "Horquilla", rating: 1080, fen: "q4rk1/1pp1bp2/3p4/n1rNp2p/2P1P1p1/P2P4/RQ3PPP/3RN1K1 w - - 2 24", solution: ["Nxe7+"] },
  { id: "g25", title: "Problema 31", theme: "Ganar material", rating: 1090, fen: "rnbqk1nr/ppp3bp/3pp1p1/5p2/1PP3Q1/4P2N/P2P1PPP/R1BNKB1R b KQkq - 1 7", solution: ["fxg4"] },
  { id: "g26", title: "Problema 32", theme: "Mate en 2", rating: 1120, fen: "3k1r2/p5p1/4pn1p/5p1P/2P2P1b/3PP2R/6P1/1rB3K1 b - - 2 37", solution: ["Rxc1+","Kh2","Ng4#"] },
  { id: "g27", title: "Problema 33", theme: "Mate en 2", rating: 1120, fen: "rn5r/p4p1p/b4kp1/8/3Pn1P1/P1pQ1P1q/8/1RB1R1K1 b - - 3 29", solution: ["Qg3+","Kf1","Qf2#"] },
  { id: "g28", title: "Problema 34", theme: "Horquilla", rating: 1140, fen: "r2k1b1r/ppNbnppp/n3q3/4P3/2Q2B2/7P/PP2PRB1/R3K1N1 w Q - 1 16", solution: ["Nxe6+"] },
  { id: "g29", title: "Problema 35", theme: "Mate en 2", rating: 1140, fen: "2r1k2r/p1p3pp/1p2p3/1bb2p2/P7/5qP1/1P4B1/R1B1R2K b k - 1 25", solution: ["Qh5+","Bh3","Qxh3#"] },
  { id: "g30", title: "Problema 36", theme: "Horquilla", rating: 1150, fen: "rnb1kb1r/pp1p2pp/1q2pp1n/8/N3PNP1/8/PP3P1P/R1BQKB1R w kq - 9 11", solution: ["Nxb6"] },
  { id: "g31", title: "Problema 37", theme: "Mate en 2", rating: 1160, fen: "3rkb2/ppp2p1Q/6pB/4n2p/2P1P1b1/P1NB4/1P3qPP/R1K4R b - - 5 24", solution: ["Nxd3+","Kb1","Qxb2#"] },
  { id: "g32", title: "Problema 38", theme: "Ataque doble", rating: 1180, fen: "r6r/3k2pp/8/pR3p2/3b1N2/P5PP/8/1R2K3 w - - 2 36", solution: ["Rd5+"] },
  { id: "g33", title: "Problema 39", theme: "Mate en 2", rating: 1180, fen: "7k/2p4r/p5P1/2B4p/5P2/P2P2P1/1pP4P/1R2R1K1 w - - 4 34", solution: ["Bd4+","Rg7","Re8#"] },
  { id: "g34", title: "Problema 40", theme: "Mate en 2", rating: 1190, fen: "2r1k2r/p1p2qpp/1p2p3/1bb2p2/P7/5PP1/1P4B1/R1B1R2K b k - 2 23", solution: ["Qh5+","Bh3","Qxh3#"] },
  { id: "g35", title: "Problema 41", theme: "Ataque doble", rating: 1220, fen: "r1bqkb1r/p2p1ppp/2p1pn2/nR6/P1P5/4PN2/1P1PBPPP/1NBQK2R b Kkq - 1 9", solution: ["cxb5"] },
  { id: "g36", title: "Problema 42", theme: "Ataque doble", rating: 1230, fen: "3qk2r/2pbnpp1/3p1p2/1B5p/1b1PPP2/2P5/6PP/1N1QK1NR w Kk - 1 17", solution: ["Bxd7+","Qxd7","cxb4"] },
  { id: "g37", title: "Problema 43", theme: "Horquilla", rating: 1230, fen: "r1bqkb1r/1p3pp1/3p1n2/p1p1p2p/3nP3/P1NP1NPP/1PP2PBK/R1BQ2R1 b - - 4 11", solution: ["Ng4+","Kh1","Nxf2+"] },
  { id: "g38", title: "Problema 44", theme: "Horquilla", rating: 1230, fen: "8/8/2P1k3/p3P3/P3R3/3P4/n6r/1K6 b - - 0 50", solution: ["Nc3+"] },
  { id: "g39", title: "Problema 45", theme: "Mate en 2", rating: 1240, fen: "4k3/1P1r4/8/8/8/5p2/2n4r/2K5 b - - 4 59", solution: ["Rxb7","Kd1","Rb1#"] },
  { id: "g40", title: "Problema 46", theme: "Mate en 2", rating: 1250, fen: "4kb2/2p1p3/pr6/2N1Rp1p/P2N1n1r/1P6/5P2/6K1 b - - 8 37", solution: ["Rg6+","Kf1","Rh1#"] },
  { id: "g41", title: "Problema 47", theme: "Ataque doble", rating: 1250, fen: "r1k2r2/1b5p/p7/1p6/4pBPp/1PNRN2P/PR3K2/8 b - - 0 30", solution: ["Rxf4+","Kg1","exd3"] },
  { id: "g42", title: "Problema 48", theme: "Ataque doble", rating: 1260, fen: "rnbqkb1r/1p3ppp/p3pn2/2p5/3p3P/2N1PP2/PPPPB1P1/R1BQK1NR b KQkq - 1 7", solution: ["dxc3"] },
  { id: "g43", title: "Problema 49", theme: "Mate en 2", rating: 1260, fen: "2r1k2r/p1p2qpp/1pb1p3/2b2p2/P7/5PP1/1P4B1/R1B2R1K b k - 0 22", solution: ["Qh5+","Bh3","Qxh3#"] },
  { id: "g44", title: "Problema 50", theme: "Ataque doble", rating: 1280, fen: "2rrQ3/6pk/1qn1p3/8/p1b4P/P3P3/1RPP1PP1/1N2K2R w - - 5 31", solution: ["Qh5+","Kg8","Rxb6"] },
  { id: "g45", title: "Problema 51", theme: "Ataque doble", rating: 1290, fen: "3rk2r/p3pp2/2p4Q/P2q4/3P4/p1P3R1/1Pn1BPP1/R1B2KN1 w k - 3 27", solution: ["Qxh8+","Kd7","Qh3+"] },
  { id: "g46", title: "Problema 52", theme: "Ganar material", rating: 1380, fen: "rnq1k2r/1pp1ppbp/3p2p1/p7/P1PP4/1P2PNPb/R4PBP/2B1KQ1R w Kkq - 3 16", solution: ["Bxh3","Qxh3","Qxh3"] },
  { id: "g47", title: "Problema 53", theme: "Ganar material", rating: 1410, fen: "3r2k1/1R2q1p1/3nP1bp/3p4/1QpPp2P/2P1P3/6P1/R5K1 b - - 6 38", solution: ["Qxb7","Qxb7","Nxb7"] },
  { id: "g48", title: "Problema 54", theme: "Ganar material", rating: 1420, fen: "1r2k2r/p3pp2/2p4Q/P2q4/3P4/p1P3R1/1Pn1BPP1/R1B2KN1 b k - 2 26", solution: ["Rxh6","Rg8+","Kd7"] },
  { id: "g49", title: "Problema 55", theme: "Ganar material", rating: 1420, fen: "2r5/7p/2p3p1/3k1p2/Pp5P/1P1P1K2/3P3P/1R6 b - a3 0 37", solution: ["bxa3","Ra1","Ra8"] },
  { id: "g50", title: "Problema 56", theme: "Ganar material", rating: 1430, fen: "1rb1kb1r/ppqpn1pp/2n2p2/2p1p3/2P4P/P1NPP3/1P3PP1/RNBQKB1R w KQk - 3 8", solution: ["Nb5","Qb6","Nd6+"] },
  { id: "g51", title: "Problema 57", theme: "Ganar material", rating: 1450, fen: "2kr2n1/p7/8/1p2QpPp/2qP1B2/5P2/KPn3B1/3RR3 w - - 1 26", solution: ["b3","Qc6","Qb8+"] },
  { id: "g52", title: "Problema 58", theme: "Ganar material", rating: 1480, fen: "r3k2r/ppp1bppp/4q3/4p3/1PN3B1/P2PP2P/3n1PP1/Q4RK1 b - - 1 19", solution: ["f5","Bh5+","g6"] },
  { id: "g53", title: "Problema 59", theme: "Ganar material", rating: 1550, fen: "r2q1k1r/1p1b1np1/5p2/pBn4p/1b6/1PN2P1P/P3N1P1/1RBQ1K1R b - - 1 22", solution: ["Bxb5","Qxd8+","Rxd8"] },
  { id: "g54", title: "Problema 60", theme: "Ganar material", rating: 1550, fen: "rn1qkbnr/1pp2ppp/3p4/pB2p3/8/P1N1P3/bPPP1PPP/R1BQK1R1 b Qkq - 2 8", solution: ["c6","Rxa2","cxb5"] },
  { id: "g55", title: "Problema 61", theme: "Mate en 3", rating: 1560, fen: "2r1k2r/p1p2qpp/1pb1p3/2b2p2/P3n3/5PP1/1P4BP/R1B2R1K b k - 1 21", solution: ["Nxg3+","hxg3","Qh5+","Bh3","Qxh3#"] },
  { id: "g56", title: "Problema 62", theme: "Mate en 3", rating: 1630, fen: "4kb2/2p1p3/pr6/2N1Rp1p/P2N1nr1/1P6/5P2/7K b - - 6 36", solution: ["Rh4+","Kg1","Rg6+","Kf1","Rh1#"] },
];

export const PUZZLE_THEMES = Array.from(new Set(PUZZLES.map((p) => p.theme))).sort();
