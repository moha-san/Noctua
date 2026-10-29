# Athenaeum — club de ajedrez

Plataforma de ajedrez inspirada en la funcionalidad de Chessigma, con dirección de arte de **biblioteca monumental**: pergamino, blanco hueso, nogal, oro viejo y mármol; Playfair Display para títulos e Inter para datos. Herramientas "premium" gratis: revisión de partidas con Stockfish 19 (WebAssembly en el navegador), problemas tácticos, partida contra el motor y estadísticas.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS 3 · chess.js 1.4 · react-chessboard 5 · Stockfish.js 19 (WASM) · Recharts · lucide-react

## Temas

- **Biblioteca** (por defecto): tonos pergamino y madera.
- **Nocturno**: la misma sala de lectura de noche. Se cambia con el botón de la lámpara (arriba a la derecha) y se recuerda.

Todos los colores son variables CSS en `src/app/globals.css` (`:root` y `[data-theme="nocturno"]`) y Tailwind las expone como `bg-canvas`, `bg-paper`, `text-ink`, `border-line`, `text-gold`, `bg-wood`, `text-good`, `text-bad`… Cambiar la paleta es tocar solo esas variables. La textura de papel (`.paper-grain`) y el mármol (`.marble`) son CSS/SVG inline, sin imágenes externas.

## Clasificación

- **Niveles** (`src/lib/ranking/ranks.ts`): Principiante (0+), Intermedio (1200+), Avanzado (1500+), Experto (1800+), Maestro (2100+) y **Élite**, reservado al Top 10. Cada nivel tiene una descripción y ventajas que se muestran como "por desbloquear".
- **`EloProgress.jsx`** (widget del Inicio): nivel actual, Elo con contador animado, barra de progreso, puntos que faltan, victorias estimadas y rival a adelantar.
- **`Leaderboard.jsx`** (ruta `/ranking`, `#ranking` en el HTML): podio para el Top 3, la lista completa agrupada por nivel con tendencias, tu fila resaltada y botón "Ir a mi posición".
- Estilos por nivel en `src/components/ranking/rankStyles.js`. Datos de ejemplo en `src/lib/data/leaderboard.ts`.

## Secciones

- **Jugar** (`/play`): 8 niveles (Stockfish con "Skill Level"), color a elegir, ritmos sin reloj / 10+0 / 5+3 / 3+2 / 1+0, piezas capturadas, deshacer (sin reloj), tablas, rendición y "Analizar partida" al terminar. La partida en curso se guarda y se puede retomar.
- **Mis partidas** (`/history`): historial local (`src/lib/history.ts`, clave `athenaeum-games`) con filtros. Cada resultado mueve tu Elo de la plataforma (K=24). Inicio, Estadísticas y la barra lateral leen estos datos (`src/hooks/useHistory.ts`).
- **Torneos** (`/tournaments`): Torneo Suizo Semanal de 5 rondas contra 7 jugadores (desempate Buchholz). Las partidas se guardan en el historial.
- **Problemas** (`/puzzles`): 62 problemas (56 generados de partidas y verificados con Stockfish 19), filtro por tema, puntuación propia, racha y modo contrarreloj de 3 minutos con 3 vidas. Progreso en `athenaeum-puzzles`.
- **Aprender** (`/learn`): explorador de aperturas con 41 líneas con nombre y código ECO (`src/lib/data/openingBook.ts`) más valoración del motor, y 6 finales básicos para practicar contra Stockfish.
- **Juegos de lógica** (`/games`): Nim, cuadrado mágico y Torres de Hanói.
- **Club** (`/club`): club Noctua (lema "Sapere aude"), actividades, eventos y miembros.
- **Ajustes** (`/settings`): nombre y país, colores del tablero (madera, mármol, verde, azul), coordenadas, animaciones, sonido, descarga de partidas en PGN y restablecer datos.
- **Información** (`/legal`): acerca de, términos y privacidad.
- Buscador (⌘K / Ctrl+K), notificaciones, sonidos generados con Web Audio (`src/lib/sound.ts`) y foco visible para teclado.

## Arrancar

```bash
npm install      # también copia Stockfish a public/stockfish (scripts/copy-stockfish.mjs)
npm run dev      # http://localhost:3000
npm run build && npm start   # producción
```

Requiere Node 18.18+ (probado con Node 22).

## Estructura

```
chessigma-clone/
├── scripts/copy-stockfish.mjs        # postinstall: copia el WASM de Stockfish a /public
├── public/stockfish/                 # stockfish.js + stockfish.wasm (generado, no se versiona)
├── tailwind.config.ts                # tokens canvas/paper/ink/line/gold/wood, fuentes serif/sans
└── src/
    ├── app/
    │   ├── layout.tsx                # <html class="dark">, fuente Inter
    │   ├── globals.css               # variables de tema, .paper-grain, .marble, .card, .btn-*, .label
    │   ├── page.tsx                  # redirige a /dashboard
    │   └── (app)/                    # grupo de rutas que comparte el AppShell
    │       ├── layout.tsx
    │       ├── dashboard/page.tsx    # Inicio: ELO, gráfico, partidas, acciones rápidas
    │       ├── play/page.tsx         # Jugar contra Stockfish
    │       ├── review/page.tsx       # Revisión de partidas (?game=g1…g5)
    │       ├── puzzles/page.tsx      # Problemas (?id=p1…p6)
    │       └── stats/page.tsx        # Estadísticas
    ├── components/
    │   ├── layout/                   # AppShell, Sidebar (índice de libro), Topbar, ThemeToggle, MobileNav, Logo, nav.ts
    │   ├── ui/Card.tsx
    │   ├── board/                    # Board (tema del tablero), EvalBar (barra de evaluación)
    │   ├── dashboard/                # RatingCards, QuickActions, EloChart, RecentGames, DailyPuzzle, WinRate
    │   ├── review/                   # GameReview, MoveList, MoveBadge, BoardOverlay, AccuracySummary, EvalGraph, PgnImport
    │   ├── puzzles/PuzzleTrainer.tsx
    │   └── play/PlayVsEngine.tsx     # ejemplo completo chess.js ↔ tablero ↔ motor
    ├── hooks/
    │   ├── useChessGame.ts           # LÓGICA BASE: chess.js + react-chessboard (arrastrar y clic)
    │   └── useStockfish.ts           # crea el motor una vez en el cliente
    └── lib/
        ├── engine/                   # types.ts (interfaz ChessEngine), stockfish.ts (UCI en Web Worker),
        │                             # mockEngine.ts (motor simulado de reserva), index.ts (createEngine)
        ├── chess/                    # analyzeGame.ts, classify.ts, evaluation.ts, openings.ts
        └── data/                     # mock.ts (usuario, ELO, partidas), puzzles.ts
```

## Cómo funciona

- **Motor.** `createEngine()` intenta arrancar Stockfish 19 *lite single-thread* como Web Worker (no necesita cabeceras COOP/COEP). Si falla, usa `MockEngine` (búsqueda de 2 plies en JS) con la misma interfaz, así la UI nunca se rompe. Para cambiar de motor solo hay que implementar `ChessEngine`.
- **Revisión.** `analyzeGame()` evalúa cada posición (profundidad 16), convierte la evaluación a probabilidad de victoria y clasifica cada jugada según cuánto la pierde: Brillante, Mejor jugada, Excelente, Buena, Jugada de libro, Dudosa, Mala y Error grave. La precisión usa la curva de Lichess.
- **Tablero de revisión.** Flecha verde con la mejor jugada, flecha de color en los errores, icono de clasificación sobre la casilla, gráfico de ventaja clicable, navegación con ← → ↑ ↓ y modo de exploración (mueve piezas y Stockfish evalúa la variante).
- **Problemas.** La casilla y el tablero se iluminan en verde si aciertas y en rojo si fallas (la jugada se deshace sola); el rival responde automáticamente en problemas de varias jugadas.

## Siguientes pasos sugeridos

- Importar partidas reales desde las APIs públicas de Lichess / chess.com.
- Backend (auth + base de datos) para ELO e historial reales; ahora los datos son de ejemplo (`lib/data/mock.ts`).
- Base de problemas grande (la de Lichess es libre, CC0).
