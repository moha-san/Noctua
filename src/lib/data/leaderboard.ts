import { USER } from "./mock";

export type Modality = "rapid" | "blitz" | "bullet";
export type LeaderboardEntry = {
  id: string;
  position: number;
  name: string;
  initials: string;
  country: string;
  elo: number;
  /** Puestos ganados (+) o perdidos (−) esta semana; null = nueva entrada. */
  trend: number | null;
  games: number;
  winRate: number;
  isMe?: boolean;
};

export const MODALITIES: { key: Modality; label: string }[] = [
  { key: "rapid", label: "Rápidas" },
  { key: "blitz", label: "Blitz" },
  { key: "bullet", label: "Bala" },
];

export const SEASON = { name: "Temporada de Otoño", endsIn: "3 d 14 h", members: 18_426 };

// Nombres de usuario de ejemplo, con el estilo habitual de una plataforma de ajedrez
const FIRST = ["carlos", "lucia", "marco", "sofia", "javier", "elena", "pablo", "ana", "diego", "laura", "andres", "marta", "ivan", "paula", "hugo", "clara", "tomas", "irene", "mateo", "julia", "daniel", "nora"];
const LAST = ["ruiz", "garcia", "moreno", "lopez", "navarro", "torres", "vidal", "romero", "castro", "ortega", "molina", "serrano", "blanco", "rubio", "marin", "iglesias", "santos", "delgado"];
const STYLES = [
  (f: string, l: string) => `${f}_${l}`,
  (f: string, l: string, n: number) => `${f}${l[0]}${n}`,
  (f: string, l: string) => `${f[0].toUpperCase()}${f.slice(1)}${l[0].toUpperCase()}${l.slice(1)}`,
  (f: string, l: string, n: number) => `${f}.${l}${n % 10 === 0 ? "" : n}`,
];
const NAMES = Array.from({ length: 102 }, (_, i) => {
  const f = FIRST[i % FIRST.length];
  const l = LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length];
  return STYLES[(i * 3) % STYLES.length](f, l, 80 + ((i * 13) % 20));
});
const FLAGS = ["🇪🇸", "🇫🇷", "🇩🇪", "🇮🇹", "🇬🇧", "🇦🇷", "🇲🇽", "🇳🇱", "🇵🇱", "🇳🇴", "🇮🇳", "🇺🇸", "🇨🇴", "🇵🇹", "🇨🇱", "🇭🇺"];

const OFFSET: Record<Modality, number> = { rapid: 0, blitz: -40, bullet: -110 };
const SEED: Record<Modality, number> = { rapid: 7, blitz: 19, bullet: 31 };

/** Generador pseudoaleatorio determinista (mismos datos en cada carga). */
function prng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const initialsOf = (name: string) =>
  name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[^A-Za-z ]/g, " ").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || name[0].toUpperCase();

/** Top 3 + los 100 siguientes, con el usuario insertado en su sitio. */
export function getLeaderboard(modality: Modality = "rapid"): LeaderboardEntry[] {
  const rnd = prng(SEED[modality]);
  const total = 103;
  const others = NAMES.slice(0, total - 1).map((name, i) => {
    const x = i / (total - 1);
    const elo = Math.round(1150 + 1370 * Math.pow(1 - x, 1.6) + OFFSET[modality] - rnd() * 6);
    const trendRoll = rnd();
    const trend = trendRoll < 0.06 ? null : trendRoll < 0.22 ? 0 : Math.round((rnd() - 0.42) * 12);
    return { id: `p${i}`, name, initials: initialsOf(name), country: FLAGS[i % FLAGS.length], elo, trend, games: 120 + Math.round(rnd() * 900), winRate: Math.round(46 + rnd() * 22) };
  });
  const me = { id: "me", name: USER.name, initials: USER.avatar, country: USER.country, elo: USER.ratings[modality], trend: 3, games: USER.stats.games, winRate: Math.round((USER.stats.wins / USER.stats.games) * 100), isMe: true };
  return [...others, me]
    .sort((a, b) => b.elo - a.elo)
    .slice(0, total)
    .map((p, i) => ({ ...p, position: i + 1 }));
}
