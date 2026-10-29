/** Libro de aperturas para el explorador. Cada línea es una secuencia SAN desde la posición inicial. */
export type BookLine = { eco: string; name: string; family: string; moves: string; desc: string };

export const BOOK: BookLine[] = [
  // 1.e4 e5
  { eco: "C60", family: "Abiertas (1.e4 e5)", name: "Apertura Española", moves: "e4 e5 Nf3 Nc6 Bb5", desc: "El alfil presiona al caballo que defiende e5. Una de las aperturas más sólidas y estudiadas." },
  { eco: "C65", family: "Abiertas (1.e4 e5)", name: "Española, Defensa Berlinesa", moves: "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8", desc: "El famoso «muro de Berlín»: se cambian damas pronto y las negras buscan un final muy sólido." },
  { eco: "C84", family: "Abiertas (1.e4 e5)", name: "Española, Variante Cerrada", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O", desc: "La línea principal: maniobras lentas y lucha por el centro con planes a largo plazo." },
  { eco: "C68", family: "Abiertas (1.e4 e5)", name: "Española, Variante del Cambio", moves: "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O", desc: "Las blancas ceden el alfil para dañar la estructura de peones negra y buscar un buen final." },
  { eco: "C50", family: "Abiertas (1.e4 e5)", name: "Apertura Italiana", moves: "e4 e5 Nf3 Nc6 Bc4", desc: "El alfil apunta a f7, el punto débil de las negras. Desarrollo rápido y natural." },
  { eco: "C53", family: "Abiertas (1.e4 e5)", name: "Giuoco Piano", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3", desc: "La versión tranquila de la Italiana: las blancas preparan d4 sin prisa." },
  { eco: "C51", family: "Abiertas (1.e4 e5)", name: "Gambito Evans", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3", desc: "Se entrega un peón para ganar tiempos y abrir el centro. Muy agresivo." },
  { eco: "C57", family: "Abiertas (1.e4 e5)", name: "Defensa de los Dos Caballos", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5", desc: "Las negras contraatacan e4 y, tras Ng5, sacrifican un peón por la iniciativa." },
  { eco: "C45", family: "Abiertas (1.e4 e5)", name: "Apertura Escocesa", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4", desc: "Las blancas abren el centro de inmediato y obtienen juego activo de piezas." },
  { eco: "C47", family: "Abiertas (1.e4 e5)", name: "Apertura de los Cuatro Caballos", moves: "e4 e5 Nf3 Nc6 Nc3 Nf6", desc: "Desarrollo simétrico y clásico. Ideal para empezar a jugar 1.e4." },
  { eco: "C42", family: "Abiertas (1.e4 e5)", name: "Defensa Petrov", moves: "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4", desc: "Las negras contraatacan e4 en lugar de defender e5. Muy sólida y con tendencia a tablas." },
  { eco: "C41", family: "Abiertas (1.e4 e5)", name: "Defensa Philidor", moves: "e4 e5 Nf3 d6 d4", desc: "Las negras defienden e5 con un peón. Algo pasiva, pero muy compacta." },
  { eco: "C30", family: "Abiertas (1.e4 e5)", name: "Gambito de Rey", moves: "e4 e5 f4", desc: "Un clásico romántico: se ofrece el peón f para destruir el centro negro y atacar por la columna f." },
  { eco: "C25", family: "Abiertas (1.e4 e5)", name: "Apertura Vienesa", moves: "e4 e5 Nc3", desc: "Las blancas desarrollan el caballo antes de decidir si juegan f4." },
  // Semiabiertas
  { eco: "B20", family: "Semiabiertas (1.e4, otras)", name: "Defensa Siciliana", moves: "e4 c5", desc: "La respuesta más combativa a 1.e4: desequilibra la posición desde la primera jugada." },
  { eco: "B90", family: "Semiabiertas (1.e4, otras)", name: "Siciliana Najdorf", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6", desc: "La favorita de Fischer y Kaspárov. a6 controla b5 y prepara e5 o b5." },
  { eco: "B70", family: "Semiabiertas (1.e4, otras)", name: "Siciliana Dragón", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6", desc: "El alfil en g7 recuerda la cola de un dragón. Ataques mutuos en flancos opuestos." },
  { eco: "B33", family: "Semiabiertas (1.e4, otras)", name: "Siciliana Sveshnikov", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5", desc: "Las negras aceptan un agujero en d5 a cambio de mucha actividad." },
  { eco: "B22", family: "Semiabiertas (1.e4, otras)", name: "Siciliana Alapin", moves: "e4 c5 c3", desc: "Las blancas evitan la teoría preparando d4 con apoyo del peón c." },
  { eco: "C00", family: "Semiabiertas (1.e4, otras)", name: "Defensa Francesa", moves: "e4 e6 d4 d5", desc: "Estructura sólida; las negras atacarán la cadena de peones blanca con c5 y f6." },
  { eco: "C11", family: "Semiabiertas (1.e4, otras)", name: "Francesa Clásica", moves: "e4 e6 d4 d5 Nc3 Nf6 Bg5", desc: "Presión sobre el caballo de f6 y lucha por la casilla e4." },
  { eco: "C02", family: "Semiabiertas (1.e4, otras)", name: "Francesa, Variante del Avance", moves: "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3", desc: "Las blancas ganan espacio con e5; las negras presionan d4." },
  { eco: "B10", family: "Semiabiertas (1.e4, otras)", name: "Defensa Caro-Kann", moves: "e4 c6 d4 d5", desc: "Como la Francesa, pero sin encerrar el alfil de casillas blancas. Muy sólida." },
  { eco: "B18", family: "Semiabiertas (1.e4, otras)", name: "Caro-Kann Clásica", moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5", desc: "El alfil sale antes de jugar e6. Posiciones tranquilas y estratégicas." },
  { eco: "B01", family: "Semiabiertas (1.e4, otras)", name: "Defensa Escandinava", moves: "e4 d5 exd5 Qxd5 Nc3 Qa5", desc: "Las negras desafían e4 de inmediato. Fácil de aprender y con un plan claro." },
  { eco: "B07", family: "Semiabiertas (1.e4, otras)", name: "Defensa Pirc", moves: "e4 d6 d4 Nf6 Nc3 g6", desc: "Las negras dejan el centro a las blancas para atacarlo después." },
  { eco: "B02", family: "Semiabiertas (1.e4, otras)", name: "Defensa Alekhine", moves: "e4 Nf6 e5 Nd5", desc: "Provoca el avance de los peones blancos para atacarlos más tarde." },
  // 1.d4
  { eco: "D06", family: "Cerradas (1.d4 d5)", name: "Gambito de Dama", moves: "d4 d5 c4", desc: "Las blancas ofrecen un peón para desviar el peón d5 y dominar el centro." },
  { eco: "D30", family: "Cerradas (1.d4 d5)", name: "Gambito de Dama Rehusado", moves: "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7", desc: "Las negras mantienen el centro con e6. Una defensa clásica y fiable." },
  { eco: "D20", family: "Cerradas (1.d4 d5)", name: "Gambito de Dama Aceptado", moves: "d4 d5 c4 dxc4 Nf3 Nf6 e3", desc: "Las negras toman el peón, pero no intentan conservarlo: buscan desarrollo libre." },
  { eco: "D10", family: "Cerradas (1.d4 d5)", name: "Defensa Eslava", moves: "d4 d5 c4 c6", desc: "Defiende d5 con el peón c y deja libre el alfil de c8." },
  { eco: "D02", family: "Cerradas (1.d4 d5)", name: "Sistema Londres", moves: "d4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3", desc: "Un esquema fijo y fácil de aprender: Bf4, e3, c3, Nf3, Bd3." },
  { eco: "E60", family: "Indias (1.d4 Nf6)", name: "Defensa India de Rey", moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6", desc: "Las negras dejan el centro y luego lo atacan con e5 o c5. Muy dinámica." },
  { eco: "D80", family: "Indias (1.d4 Nf6)", name: "Defensa Grünfeld", moves: "d4 Nf6 c4 g6 Nc3 d5", desc: "Las negras golpean el centro con d5 y luego lo presionan con el alfil de g7." },
  { eco: "E20", family: "Indias (1.d4 Nf6)", name: "Defensa Nimzoindia", moves: "d4 Nf6 c4 e6 Nc3 Bb4", desc: "La clavada del caballo controla e4. Una de las defensas más respetadas." },
  { eco: "E12", family: "Indias (1.d4 Nf6)", name: "Defensa India de Dama", moves: "d4 Nf6 c4 e6 Nf3 b6", desc: "El alfil en fianchetto en b7 controla la casilla e4." },
  { eco: "A80", family: "Indias (1.d4 Nf6)", name: "Defensa Holandesa", moves: "d4 f5", desc: "Las negras controlan e4 con el peón f y buscan ataque en el flanco de rey." },
  { eco: "A57", family: "Indias (1.d4 Nf6)", name: "Gambito Benko", moves: "d4 Nf6 c4 c5 d5 b5", desc: "Se entrega un peón para abrir columnas en el flanco de dama." },
  // Flanco
  { eco: "A10", family: "De flanco", name: "Apertura Inglesa", moves: "c4", desc: "Las blancas controlan d5 desde el lado. Flexible: puede transponer a muchas aperturas." },
  { eco: "A04", family: "De flanco", name: "Apertura Réti", moves: "Nf3 d5 c4", desc: "Control del centro a distancia con piezas, al estilo hipermoderno." },
  { eco: "A00", family: "De flanco", name: "Apertura Larsen", moves: "b3", desc: "Fianchetto inmediato del alfil de dama. Poco común y algo sorpresiva." },
];

/** Normaliza: "e4 e5" → ["e4","e5"] */
export const lineMoves = (l: BookLine) => l.moves.split(" ");
