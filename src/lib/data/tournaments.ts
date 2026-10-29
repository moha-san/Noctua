export type TournamentInfo = {
  id: string;
  name: string;
  format: string;
  rhythm: string;
  when: string;
  status: "abierto" | "proximamente" | "finalizado";
  players: number;
  prize: string;
  blurb: string;
};

export const TOURNAMENTS: TournamentInfo[] = [
  {
    id: "agora",
    name: "Torneo Suizo Semanal",
    format: "Suizo · 5 rondas",
    rhythm: "10 min por jugador",
    when: "Abierto ahora",
    status: "abierto",
    players: 8,
    prize: "Insignia de bronce",
    blurb: "Juegas contra siete rivales de distinto nivel. Las demás mesas se juegan a la vez y la clasificación se actualiza tras cada ronda.",
  },
  {
    id: "tetractys",
    name: "Copa de Otoño",
    format: "Eliminatoria · 16 jugadores",
    rhythm: "5 + 3",
    when: "Sábado 7 de noviembre, 18:00",
    status: "proximamente",
    players: 11,
    prize: "Trofeo y insignia de oro",
    blurb: "Cuatro rondas eliminatorias. Cada cruce se decide a dos partidas, con desempate a blitz si hace falta.",
  },
  {
    id: "armonia",
    name: "Arena Blitz de los jueves",
    format: "Arena · 60 minutos",
    rhythm: "3 + 0",
    when: "Cada jueves, 21:00",
    status: "proximamente",
    players: 42,
    prize: "Puntos para el ranking",
    blurb: "Una hora de partidas rápidas seguidas. Las rachas de victorias puntúan doble.",
  },
  {
    id: "solsticio",
    name: "Simultánea de verano",
    format: "Simultánea · 20 tableros",
    rhythm: "Sin reloj",
    when: "21 de junio",
    status: "finalizado",
    players: 20,
    prize: "Partida comentada",
    blurb: "Un maestro FIDE jugó contra veinte miembros del club a la vez. Ganó 17, entabló 2 y perdió 1.",
  },
];
