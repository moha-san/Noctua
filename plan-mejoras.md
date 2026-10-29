# Plan de mejoras · Athenaeum

Plan priorizado para seguir mejorando la plataforma. Cada tanda termina con compilación, pruebas en navegador (ordenador y móvil) y `athenaeum.html` + zip regenerados. Marca: [x] hecho, [ ] pendiente.

## Tanda 1 · Jugar de verdad (lo que más se usa)
- [x] Jugar: elegir nivel (8 niveles, de 600 a 2200 aprox.), color (blancas, negras, al azar) y ritmo (sin reloj, 10+0, 5+3, 3+2).
- [x] Reloj con incremento, piezas capturadas y ventaja material.
- [x] Lista de jugadas en notación, deshacer, rendirse, proponer tablas y "Analizar esta partida" al terminar.
- [x] Sonidos de movimiento, captura, jaque y fin (generados con Web Audio, se pueden apagar).
- [x] Guardar la partida en curso para no perderla al recargar.

## Tanda 2 · Historial y datos propios
- [x] Guardar cada partida terminada (jugar y torneos) en el navegador.
- [x] Inicio y Estadísticas leen esas partidas: recientes, % de victorias, Elo que sube o baja con cada resultado.
- [x] Página "Mis partidas" con filtro por resultado y botón Analizar.

## Tanda 3 · Problemas
- [x] Ampliar a 30+ problemas verificados por temas (mate en 1, mate en 2, clavada, horquilla, ataque doble…).
- [x] Puntuación de problemas que sube o baja, racha y filtro por tema.
- [x] Modo contrarreloj (3 minutos, el máximo de problemas).

## Tanda 4 · Ajustes y accesibilidad
- [x] Página Ajustes: tema del tablero (madera, mármol, verde clásico), coordenadas, flechas, sonido, confirmar jugadas.
- [x] Perfil editable (nombre, país, avatar con iniciales).
- [x] Revisión de accesibilidad: foco visible, etiquetas, contraste, navegación con teclado.

## Tanda 5 · Aprender
- [x] Explorador de aperturas con las líneas principales y su nombre.
- [x] Lecciones cortas (finales básicos: rey y dama, rey y torre) con tablero interactivo.

## Tanda 6 · Pulido profesional
- [x] Estados vacíos y de carga cuidados, mensajes de error claros.
- [x] Página "Acerca de", términos y privacidad básicos.
- [x] Imagen del club Noctua (logo "La Mirada") donde encaje, sin cambiar el nombre de la web.
- [x] Rendimiento: el motor se lee al final, después de mostrar la página.

## Notas
- La web se llama Athenaeum; el club se llama Noctua (logo final "La Mirada" en `marketing/logo-noctua/mirada/`, lema "Sapere aude").
- Nombres normales y tono profesional en toda la interfaz.
- Código en `chessigma-clone/`; versión de un archivo en `athenaeum.html`.

## Siguientes ideas (pendientes)
- [x] Precisión de tus propias partidas guardada al analizarlas (para que aparezca en Mis partidas y Estadísticas).
- [x] Gráfica de Elo con tus partidas reales, no solo los datos de ejemplo.
- [ ] Más problemas (objetivo: 150) y más finales (torre contra peón, Lucena, Philidor).
- [x] Repasar aperturas: modo práctica en el que tienes que adivinar la jugada del libro.
- [ ] Torneo eliminatorio (Copa de Otoño) además del suizo.
- [ ] Cargar el motor solo al usarlo para que la página abra más rápido.
- [ ] Logo de Noctua como icono de la pestaña y en la pantalla de carga, si Moha lo quiere en toda la web.

## Club Noctua: admisión y emparejamiento
- [x] Prueba de Admisión en la web (`/admission`): problema al azar con 90 s y un solo fallo, Nim con montones al azar contra un ordenador perfecto (3 min) y pregunta abierta sin pegar texto (15 min). Salir de la pestaña dos veces o recargar suspende. Reintento a los 7 días.
- [x] Emparejar con tu nivel en Jugar (rival del ordenador con el Elo más cercano).
- [x] Servidor (Supabase): cuentas, una prueba por cuenta, problemas y respuestas guardados en el servidor, lista de espera numerada y emparejamiento entre personas.

## Tanda 8 · Al nivel de las grandes plataformas (29/10)
- [x] «Jugar» = online contra personas; «Jugar con bots» aparte.
- [x] Transición suave entre secciones y vuelta arriba al cambiar.
- [x] Elegir pieza al coronar (bots, torneos, finales y online).
- [x] Online: premovimientos, repasar jugadas con flechas, aviso a 10 s, clasificación, últimas partidas y «otra partida» en un clic.
- [x] Bots con personaje (Lucas, Marta, Diego, Elena, Andrés, Sofía, Víctor y Stockfish), pistas y girar tablero (tecla F).
- [x] Retar a un amigo con un enlace o un código.
- [x] Ver partidas en directo de otros jugadores.
- [x] Logros e insignias (30: partidas, rivales, problemas, aprender y club).
- [ ] Juegos de piezas alternativos en Ajustes.
- [ ] Legal completo (después, cuando Moha lo pida).
