import { BarChart3, Info, ShieldCheck, GraduationCap, History, Settings, Crown, Dices, Home, Microscope, Puzzle, Swords, Trophy, Users, Wifi, Bot, Medal, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Etiqueta corta para la barra inferior del móvil */
  short: string;
  group: "Jugar" | "Entrenar" | "Comunidad" | "Cuenta";
  icon: LucideIcon;
  /** Palabras extra para el buscador */
  keywords?: string;
  note?: string;
  /** Se muestra en la barra inferior del móvil */
  mobile?: boolean;
};

export const NAV_GROUPS = ["Jugar", "Entrenar", "Comunidad"] as const;

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", short: "Inicio", group: "Jugar", icon: Home, keywords: "panel resumen elo", mobile: true },
  { href: "/online", label: "Jugar", short: "Jugar", group: "Jugar", icon: Swords, keywords: "online rival personas emparejamiento matchmaking en directo partida", mobile: true },
  { href: "/play", label: "Jugar con bots", short: "Bots", group: "Jugar", icon: Bot, keywords: "partida stockfish bot motor ordenador niveles" },
  { href: "/tournaments", label: "Torneos", short: "Torneos", group: "Jugar", icon: Trophy, keywords: "suizo copa arena", note: "En vivo", mobile: true },
  { href: "/history", label: "Mis partidas", short: "Partidas", group: "Jugar", icon: History, keywords: "historial partidas jugadas resultados" },
  { href: "/achievements", label: "Logros", short: "Logros", group: "Jugar", icon: Medal, keywords: "logros insignias medallas trofeos retos" },
  { href: "/review", label: "Análisis", short: "Análisis", group: "Entrenar", icon: Microscope, keywords: "revisión pgn precisión", note: "Gratis" },
  { href: "/puzzles", label: "Problemas", short: "Problemas", group: "Entrenar", icon: Puzzle, keywords: "tácticas ejercicios mate" },
  { href: "/learn", label: "Aprender", short: "Aprender", group: "Entrenar", icon: GraduationCap, keywords: "aperturas finales lecciones explorador eco teoría" },
  { href: "/games", label: "Juegos de lógica", short: "Juegos", group: "Entrenar", icon: Dices, keywords: "nim cuadrado mágico hanói", mobile: true },
  { href: "/club", label: "Club", short: "Club", group: "Comunidad", icon: Users, keywords: "eventos calendario socios miembros" },
  { href: "/admission", label: "Prueba de admisión", short: "Admisión", group: "Comunidad", icon: ShieldCheck, keywords: "noctua entrar club prueba acceso" },
  { href: "/stats", label: "Estadísticas", short: "Estadísticas", group: "Comunidad", icon: BarChart3, keywords: "aperturas rendimiento" },
  { href: "/ranking", label: "Clasificación", short: "Ranking", group: "Comunidad", icon: Crown, keywords: "clasificación leaderboard rangos" },
  { href: "/profile", label: "Mi perfil", short: "Perfil", group: "Cuenta", icon: UserRound, keywords: "perfil público medallas elo cuenta" },
  { href: "/settings", label: "Ajustes", short: "Ajustes", group: "Cuenta", icon: Settings, keywords: "configuración perfil tablero sonido nombre colores" },
  { href: "/legal", label: "Información", short: "Info", group: "Cuenta", icon: Info, keywords: "acerca de términos privacidad contacto ayuda" },
];
