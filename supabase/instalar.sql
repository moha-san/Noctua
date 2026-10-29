-- =====================================================================
-- Athenaeum · Club Noctua · Base de datos (Supabase / PostgreSQL)
--
-- Cómo instalar: Supabase → SQL Editor → New query → pega este archivo
-- completo → Run. Se puede ejecutar varias veces sin romper nada.
--
-- Idea general contra las trampas:
--   * Las soluciones de los problemas viven en el esquema "private", que la
--     web no puede leer. La web solo recibe la posición.
--   * Toda la prueba se comprueba en el servidor: tiempo, jugadas, Nim y
--     respuesta. La web solo envía lo que hace el usuario.
--   * Una prueba por cuenta; si suspendes, 7 días de espera.
--   * Las partidas online guardan reloj y turno en el servidor.
-- =====================================================================

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24 and username ~ '^[A-Za-z0-9_.áéíóúñÁÉÍÓÚÑ -]+$'),
  country text default 'España',
  rating int not null default 1200,
  games int not null default 0,
  status text not null default 'aspirante' check (status in ('aspirante', 'pendiente', 'miembro', 'rechazado')),
  waitlist_number int unique,
  invites_left int not null default 3,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "perfiles visibles" on public.profiles;
create policy "perfiles visibles" on public.profiles for select using (true);
-- Los usuarios no pueden cambiar su Elo ni su estado: solo nombre y país, vía función.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;

create sequence if not exists private.waitlist_seq start 1;

-- Crear el perfil al registrarse (el nombre llega en los metadatos del registro)
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  base text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1));
  name text := left(regexp_replace(base, '[^A-Za-z0-9_.]', '', 'g'), 20);
begin
  if char_length(name) < 3 then name := 'jugador'; end if;
  while exists (select 1 from public.profiles where username = name) loop
    name := left(name, 16) || floor(random() * 9000 + 1000)::int;
  end loop;
  insert into public.profiles (id, username) values (new.id, name);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.update_profile(p_username text, p_country text) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare r public.profiles;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  update public.profiles set username = trim(p_username), country = left(coalesce(p_country, 'España'), 40)
    where id = auth.uid() returning * into r;
  return r;
end $$;

-- ---------------------------------------------------------------------
-- Prueba de admisión
-- ---------------------------------------------------------------------
create table if not exists private.adm_puzzles (
  id text primary key,
  fen text not null,
  solution jsonb not null,  -- todas las jugadas SAN (jugador, rival, jugador…)
  accepted jsonb not null,  -- por cada jugada del jugador, las jugadas aceptadas
  rating int not null
);

create table if not exists private.adm_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null default 'puzzle' check (stage in ('puzzle', 'nim', 'question', 'passed', 'failed')),
  started_at timestamptz not null default now(),
  stage_started_at timestamptz not null default now(),
  finished_at timestamptz,
  puzzle_id text references private.adm_puzzles (id),
  puzzle_ply int not null default 0,
  puzzle_mistakes int not null default 0,
  nim_heaps int[],
  strikes int not null default 0,
  answer text,
  reason text
);
create index if not exists adm_attempts_user on private.adm_attempts (user_id, started_at desc);

-- Límites (segundos). Se da un pequeño margen por la latencia de red.
create or replace function private.adm_limit(stage text) returns interval language sql immutable as $$
  select case stage when 'puzzle' then interval '95 seconds' when 'nim' then interval '185 seconds' when 'question' then interval '15 minutes 10 seconds' end
$$;

create or replace function private.adm_fail(a private.adm_attempts, why text) returns jsonb
language plpgsql security definer set search_path = private, public as $$
begin
  update private.adm_attempts set stage = 'failed', reason = why, finished_at = now() where id = a.id;
  return jsonb_build_object('stage', 'failed', 'reason', why, 'retry_at', now() + interval '7 days');
end $$;

-- Intento activo del usuario, comprobando que no se ha pasado de tiempo
create or replace function private.adm_current() returns private.adm_attempts
language plpgsql security definer set search_path = private, public as $$
declare a private.adm_attempts;
begin
  select * into a from private.adm_attempts where user_id = auth.uid() order by started_at desc limit 1;
  return a;
end $$;

-- Estado para la web (sin revelar soluciones)
create or replace function public.adm_status() returns jsonb
language plpgsql security definer set search_path = private, public as $$
declare a private.adm_attempts; p public.profiles;
begin
  if auth.uid() is null then return jsonb_build_object('stage', 'anon'); end if;
  a := private.adm_current();
  select * into p from public.profiles where id = auth.uid();
  if a.id is null then return jsonb_build_object('stage', 'none', 'profile', to_jsonb(p)); end if;
  -- Un intento a medias que ha superado el tiempo se da por suspendido
  if a.stage in ('puzzle', 'nim', 'question') and now() > a.stage_started_at + private.adm_limit(a.stage) then
    perform private.adm_fail(a, 'Se acabó el tiempo o se abandonó la prueba a medias.');
    a := private.adm_current();
  end if;
  return jsonb_build_object(
    'stage', a.stage, 'reason', a.reason, 'started_at', a.started_at, 'finished_at', a.finished_at,
    'retry_at', case when a.stage = 'failed' then a.finished_at + interval '7 days' end,
    'profile', to_jsonb(p));
end $$;

-- Empezar la prueba: elige un problema al azar y devuelve solo la posición
create or replace function public.adm_start() returns jsonb
language plpgsql security definer set search_path = private, public as $$
declare a private.adm_attempts; pz private.adm_puzzles;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  a := private.adm_current();
  if a.id is not null then
    if a.stage = 'passed' then raise exception 'Ya has superado la prueba'; end if;
    if a.stage in ('puzzle', 'nim', 'question') then
      -- Empezar otra vez con una prueba abierta cuenta como abandono
      -- (no se lanza excepción para que el suspenso quede guardado)
      return private.adm_fail(a, 'Se empezó una prueba nueva sin terminar la anterior.');
    end if;
    if a.stage = 'failed' and a.finished_at > now() - interval '7 days' then
      raise exception 'Podrás repetir la prueba a partir del %', to_char(a.finished_at + interval '7 days', 'DD/MM/YYYY HH24:MI');
    end if;
  end if;
  select * into pz from private.adm_puzzles order by random() limit 1;
  insert into private.adm_attempts (user_id, puzzle_id) values (auth.uid(), pz.id) returning * into a;
  return jsonb_build_object('attempt', a.id, 'stage', 'puzzle', 'fen', pz.fen, 'seconds', 90, 'player_moves', jsonb_array_length(pz.accepted));
end $$;

-- Jugada en el problema. Devuelve la respuesta del rival o el resultado.
create or replace function public.adm_puzzle_move(p_san text) returns jsonb
language plpgsql security definer set search_path = private, public as $$
declare a private.adm_attempts; pz private.adm_puzzles; idx int; ok boolean; reply text;
begin
  a := private.adm_current();
  if a.id is null or a.stage <> 'puzzle' then raise exception 'No hay ningún problema en curso'; end if;
  if now() > a.stage_started_at + private.adm_limit('puzzle') then return private.adm_fail(a, 'Se acabó el tiempo del problema de ajedrez.'); end if;
  select * into pz from private.adm_puzzles where id = a.puzzle_id;
  idx := a.puzzle_ply / 2;
  ok := (pz.accepted -> idx) ? p_san;
  if not ok then
    if a.puzzle_mistakes >= 1 then return private.adm_fail(a, 'Dos jugadas incorrectas en el problema de ajedrez.'); end if;
    update private.adm_attempts set puzzle_mistakes = puzzle_mistakes + 1 where id = a.id;
    return jsonb_build_object('ok', false, 'mistakes', a.puzzle_mistakes + 1);
  end if;
  -- ¿Era la última jugada del jugador?
  if idx + 1 >= jsonb_array_length(pz.accepted) then
    update private.adm_attempts set stage = 'nim', stage_started_at = now(), nim_heaps = private.nim_random() where id = a.id
      returning * into a;
    return jsonb_build_object('ok', true, 'done', true, 'stage', 'nim', 'heaps', to_jsonb(a.nim_heaps), 'seconds', 180);
  end if;
  reply := pz.solution ->> (a.puzzle_ply + 1);
  update private.adm_attempts set puzzle_ply = puzzle_ply + 2 where id = a.id;
  return jsonb_build_object('ok', true, 'done', false, 'reply', reply);
end $$;

-- Nim: montones al azar con nim-suma distinta de cero
create or replace function private.nim_random() returns int[] language plpgsql as $$
declare h int[]; x int; s int;
begin
  loop
    h := array[1 + floor(random() * 7)::int, 1 + floor(random() * 7)::int, 1 + floor(random() * 7)::int, 1 + floor(random() * 7)::int];
    x := h[1] # h[2] # h[3] # h[4];
    s := h[1] + h[2] + h[3] + h[4];
    exit when x <> 0 and s >= 12;
  end loop;
  return h;
end $$;

create or replace function public.adm_nim_move(p_heap int, p_take int) returns jsonb
language plpgsql security definer set search_path = private, public as $$
declare a private.adm_attempts; h int[]; x int; i int; t int; bot_heap int; bot_take int;
begin
  a := private.adm_current();
  if a.id is null or a.stage <> 'nim' then raise exception 'No hay ninguna partida de Nim en curso'; end if;
  if now() > a.stage_started_at + private.adm_limit('nim') then return private.adm_fail(a, 'Se acabó el tiempo del reto de lógica.'); end if;
  h := a.nim_heaps;
  if p_heap < 1 or p_heap > 4 or p_take < 1 or p_take > h[p_heap] then raise exception 'Jugada no válida'; end if;
  h[p_heap] := h[p_heap] - p_take;
  if h[1] + h[2] + h[3] + h[4] = 0 then
    update private.adm_attempts set stage = 'question', stage_started_at = now(), nim_heaps = h where id = a.id;
    return jsonb_build_object('heaps', to_jsonb(h), 'won', true, 'stage', 'question', 'seconds', 900);
  end if;
  -- Respuesta perfecta del ordenador
  x := h[1] # h[2] # h[3] # h[4];
  bot_heap := null;
  if x <> 0 then
    for i in 1..4 loop
      t := h[i] # x;
      if t < h[i] then bot_heap := i; bot_take := h[i] - t; exit; end if;
    end loop;
  end if;
  if bot_heap is null then
    for i in 1..4 loop if h[i] > 0 then bot_heap := i; bot_take := 1; exit; end if; end loop;
  end if;
  h[bot_heap] := h[bot_heap] - bot_take;
  update private.adm_attempts set nim_heaps = h where id = a.id;
  if h[1] + h[2] + h[3] + h[4] = 0 then
    perform private.adm_fail(a, 'El ordenador retiró la última ficha en el reto de lógica.');
    return jsonb_build_object('heaps', to_jsonb(h), 'bot', jsonb_build_array(bot_heap, bot_take), 'won', false, 'stage', 'failed');
  end if;
  return jsonb_build_object('heaps', to_jsonb(h), 'bot', jsonb_build_array(bot_heap, bot_take));
end $$;

-- Respuesta abierta: se guarda para que el club la revise
create or replace function public.adm_answer(p_text text) returns jsonb
language plpgsql security definer set search_path = private, public as $$
declare a private.adm_attempts; n int; len int := char_length(trim(coalesce(p_text, '')));
begin
  a := private.adm_current();
  if a.id is null or a.stage <> 'question' then raise exception 'No hay ninguna pregunta en curso'; end if;
  if now() > a.stage_started_at + private.adm_limit('question') then return private.adm_fail(a, 'Se acabó el tiempo de la pregunta.'); end if;
  -- Escribir 300 caracteres en menos de 40 segundos no es humano: se rechaza
  if now() < a.stage_started_at + interval '40 seconds' then return private.adm_fail(a, 'La respuesta llegó demasiado rápido para haberla escrito.'); end if;
  if len < 300 or len > 1500 then raise exception 'La respuesta debe tener entre 300 y 1500 caracteres'; end if;
  n := nextval('private.waitlist_seq');
  update private.adm_attempts set stage = 'passed', answer = trim(p_text), finished_at = now() where id = a.id;
  update public.profiles set status = 'pendiente', waitlist_number = n where id = a.user_id;
  return jsonb_build_object('stage', 'passed', 'waitlist_number', n, 'seconds', extract(epoch from now() - a.started_at)::int);
end $$;

-- La web avisa si el usuario sale de la pestaña; a la segunda, suspende
create or replace function public.adm_strike() returns jsonb
language plpgsql security definer set search_path = private, public as $$
declare a private.adm_attempts;
begin
  a := private.adm_current();
  if a.id is null or a.stage not in ('puzzle', 'nim', 'question') then return jsonb_build_object('strikes', 0); end if;
  if a.strikes >= 1 then return private.adm_fail(a, 'Has salido de la página dos veces durante la prueba.'); end if;
  update private.adm_attempts set strikes = strikes + 1 where id = a.id;
  return jsonb_build_object('strikes', a.strikes + 1);
end $$;

-- Lista para revisar respuestas (solo desde el panel de Supabase: SQL Editor)
create or replace view private.adm_review as
  select p.waitlist_number, p.username, a.answer, a.finished_at, a.user_id
  from private.adm_attempts a join public.profiles p on p.id = a.user_id
  where a.stage = 'passed' and p.status = 'pendiente' order by p.waitlist_number;

-- Para admitir a alguien:  update public.profiles set status = 'miembro' where username = 'nombre';

-- ---------------------------------------------------------------------
-- Emparejamiento y partidas online
-- ---------------------------------------------------------------------
create table if not exists public.mm_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rating int not null,
  time_control text not null,
  joined_at timestamptz not null default now()
);
alter table public.mm_queue add column if not exists variant text not null default 'standard';
alter table public.mm_queue enable row level security;
revoke all on public.mm_queue from anon, authenticated;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  white uuid not null references auth.users (id),
  black uuid not null references auth.users (id),
  time_control text not null,
  base_ms int not null,
  inc_ms int not null,
  moves text[] not null default '{}',
  white_ms int not null,
  black_ms int not null,
  last_move_at timestamptz,
  status text not null default 'playing' check (status in ('playing', 'finished')),
  result text check (result in ('1-0', '0-1', '1/2-1/2')),
  reason text,
  draw_offer uuid,
  white_rating int,
  black_rating int,
  rating_change int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.games enable row level security;
-- Las partidas son públicas (como en cualquier plataforma): así se pueden ver en directo
drop policy if exists "ver mis partidas" on public.games;
create policy "ver mis partidas" on public.games for select using (true);
revoke insert, update, delete on public.games from anon, authenticated;
grant select on public.games to anon, authenticated;

-- Variantes: Chess960 (posición inicial al azar) y por correspondencia (1 día por jugada)
alter table public.games add column if not exists variant text not null default 'standard';
alter table public.games add column if not exists start_fen text;

-- Posición inicial de Chess960: alfiles en casillas de distinto color y el rey entre las torres.
-- Se juega sin enroque (la web usa chess.js, que no admite el enroque de Chess960).
create or replace function private.fen960() returns text language plpgsql as $$
declare r text[] := array['', '', '', '', '', '', '', '']; free int[]; i int; k int;
begin
  r[1 + 2 * floor(random() * 4)::int] := 'b';
  r[2 + 2 * floor(random() * 4)::int] := 'b';
  foreach k in array array[1, 2, 3] loop
    select array_agg(x) into free from generate_series(1, 8) x where r[x] = '';
    r[free[1 + floor(random() * array_length(free, 1))::int]] := case k when 1 then 'q' else 'n' end;
  end loop;
  select array_agg(x order by x) into free from generate_series(1, 8) x where r[x] = '';
  r[free[1]] := 'r'; r[free[2]] := 'k'; r[free[3]] := 'r';
  return array_to_string(r, '') || '/pppppppp/8/8/8/8/PPPPPPPP/' || upper(array_to_string(r, '')) || ' w - - 0 1';
end $$;

create or replace function private.valid_variant(v text) returns text language plpgsql immutable as $$
begin
  if v is null or v = '' then return 'standard'; end if;
  if v not in ('standard', 'chess960') then raise exception 'Variante no válida'; end if;
  return v;
end $$;

-- Datos para el juego limpio: tiempo de cada jugada, salidas de la pestaña y reclamaciones
alter table public.games add column if not exists white_times int[] not null default '{}';
alter table public.games add column if not exists black_times int[] not null default '{}';
alter table public.games add column if not exists white_blur int not null default 0;
alter table public.games add column if not exists black_blur int not null default 0;
alter table public.games add column if not exists disputed_by uuid;
alter table public.games add column if not exists dispute_reason text;
alter table public.profiles add column if not exists banned boolean not null default false;

create or replace function private.assert_fair() returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select banned from public.profiles where id = auth.uid()) then
    raise exception 'Tu cuenta está suspendida para jugar online por juego sucio. Escribe al club si crees que es un error.';
  end if;
end $$;

-- Actualizaciones en tiempo real de las partidas
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.games; exception when duplicate_object then null; end;
  end if;
end $$;

create or replace function private.tc_ms(tc text, out base_ms int, out inc_ms int) language sql immutable as $$
  -- '1d' = por correspondencia: un día para cada jugada
  select case when tc = '1d' then 86400000 else split_part(tc, '+', 1)::int * 60000 end,
         case when tc = '1d' then 0 else coalesce(nullif(split_part(tc, '+', 2), ''), '0')::int * 1000 end
$$;

-- Buscar rival. Ventana de Elo que se amplía con la espera: ±100, +50 cada 10 s.
drop function if exists public.mm_find(text);
create or replace function public.mm_find(p_tc text, p_variant text default 'standard') returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare me public.profiles; opp public.mm_queue; g public.games; t record; existing public.games; w uuid; b uuid; v text := private.valid_variant(p_variant);
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p_tc not in ('10+0', '5+3', '3+2', '1+0', '15+10') then raise exception 'Ritmo no válido'; end if;
  perform private.assert_fair();
  select * into existing from public.games where status = 'playing' and time_control <> '1d' and auth.uid() in (white, black) order by created_at desc limit 1;
  if existing.id is not null then return jsonb_build_object('game', existing.id); end if;
  select * into me from public.profiles where id = auth.uid();
  delete from public.mm_queue where joined_at < now() - interval '2 minutes';
  select * into opp from public.mm_queue q
    where q.user_id <> me.id and q.time_control = p_tc and q.variant = v
      and abs(q.rating - me.rating) <= 100 + 50 * floor(extract(epoch from now() - q.joined_at) / 10)
    order by abs(q.rating - me.rating), q.joined_at
    limit 1 for update skip locked;
  if opp.user_id is null then
    insert into public.mm_queue (user_id, rating, time_control, variant) values (me.id, me.rating, p_tc, v)
      on conflict (user_id) do update set time_control = excluded.time_control, variant = excluded.variant, rating = excluded.rating,
        joined_at = case when mm_queue.time_control = excluded.time_control and mm_queue.variant = excluded.variant then mm_queue.joined_at else now() end;
    return jsonb_build_object('waiting', true);
  end if;
  delete from public.mm_queue where user_id in (opp.user_id, me.id);
  t := private.tc_ms(p_tc);
  if random() < 0.5 then w := me.id; b := opp.user_id; else w := opp.user_id; b := me.id; end if;
  insert into public.games (white, black, time_control, base_ms, inc_ms, white_ms, black_ms, white_rating, black_rating, variant, start_fen)
    values (w, b, p_tc, t.base_ms, t.inc_ms, t.base_ms, t.base_ms,
      (select rating from public.profiles where id = w), (select rating from public.profiles where id = b),
      v, case when v = 'chess960' then private.fen960() end)
    returning * into g;
  return jsonb_build_object('game', g.id);
end $$;

create or replace function public.mm_cancel() returns void
language sql security definer set search_path = public as $$
  delete from public.mm_queue where user_id = auth.uid();
$$;

-- Termina la partida y actualiza el Elo (K = 24)
create or replace function private.finish_game(gid uuid, res text, why text) returns public.games
language plpgsql security definer set search_path = public, private as $$
declare g public.games; ew float; sw float; change int;
begin
  select * into g from public.games where id = gid for update;
  if g.status = 'finished' then return g; end if;
  ew := 1 / (1 + power(10, (g.black_rating - g.white_rating) / 400.0));
  sw := case res when '1-0' then 1 when '0-1' then 0 else 0.5 end;
  change := case when coalesce(array_length(g.moves, 1), 0) < 4 then 0 else round(24 * (sw - ew)) end;
  update public.games set status = 'finished', result = res, reason = why, rating_change = change, updated_at = now(), draw_offer = null
    where id = gid returning * into g;
  update public.profiles set rating = rating + change, games = games + 1 where id = g.white;
  update public.profiles set rating = rating - change, games = games + 1 where id = g.black;
  if g.tournament is not null then perform private.tour_score(g); end if;
  return g;
end $$;

-- Hacer una jugada. El servidor controla el turno y el reloj.
-- p_flag: 'checkmate', 'stalemate', 'draw' cuando la jugada termina la partida (lo comprueba chess.js en ambos clientes).
create or replace function public.game_move(p_game uuid, p_san text, p_flag text default null) returns public.games
language plpgsql security definer set search_path = public, private as $$
declare g public.games; n int; white_turn boolean; elapsed int;
begin
  select * into g from public.games where id = p_game for update;
  if g.id is null or g.status <> 'playing' then raise exception 'La partida no está en juego'; end if;
  n := coalesce(array_length(g.moves, 1), 0);
  white_turn := n % 2 = 0;
  if (white_turn and auth.uid() <> g.white) or (not white_turn and auth.uid() <> g.black) then raise exception 'No es tu turno'; end if;
  if p_san !~ '^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?|O-O(-O)?)[+#]?$' then raise exception 'Jugada no válida'; end if;
  -- El reloj empieza tras la primera jugada de cada bando
  elapsed := case when n < 2 or g.last_move_at is null then 0 else (extract(epoch from now() - g.last_move_at) * 1000)::int end;
  if g.time_control = '1d' and n >= 2 then
    -- Por correspondencia: si has jugado a tiempo, vuelves a tener un día entero
    if elapsed > (case when white_turn then g.white_ms else g.black_ms end) then
      return private.finish_game(g.id, case when white_turn then '0-1' else '1-0' end, 'Tiempo agotado');
    end if;
    if white_turn then g.white_ms := g.base_ms + elapsed; else g.black_ms := g.base_ms + elapsed; end if;
  end if;
  if white_turn then
    g.white_ms := g.white_ms - elapsed;
    if g.white_ms <= 0 then return private.finish_game(g.id, '0-1', 'Tiempo agotado'); end if;
    g.white_ms := g.white_ms + case when n >= 2 then g.inc_ms else 0 end;
  else
    g.black_ms := g.black_ms - elapsed;
    if g.black_ms <= 0 then return private.finish_game(g.id, '1-0', 'Tiempo agotado'); end if;
    g.black_ms := g.black_ms + case when n >= 2 then g.inc_ms else 0 end;
  end if;
  update public.games set moves = array_append(moves, p_san), white_ms = g.white_ms, black_ms = g.black_ms,
    white_times = case when white_turn then array_append(white_times, elapsed) else white_times end,
    black_times = case when white_turn then black_times else array_append(black_times, elapsed) end,
    last_move_at = now(), updated_at = now(), draw_offer = null where id = g.id returning * into g;
  if p_flag = 'checkmate' then return private.finish_game(g.id, case when white_turn then '1-0' else '0-1' end, 'Jaque mate'); end if;
  if p_flag in ('stalemate', 'draw') then return private.finish_game(g.id, '1/2-1/2', case p_flag when 'stalemate' then 'Rey ahogado' else 'Tablas' end); end if;
  return g;
end $$;

-- Reclamar victoria si al rival se le ha acabado el tiempo (o no mueve en 60 s al empezar)
create or replace function public.game_claim(p_game uuid) returns public.games
language plpgsql security definer set search_path = public, private as $$
declare g public.games; n int; white_turn boolean; left_ms int;
begin
  select * into g from public.games where id = p_game;
  if g.status <> 'playing' or auth.uid() not in (g.white, g.black) then return g; end if;
  n := coalesce(array_length(g.moves, 1), 0);
  white_turn := n % 2 = 0;
  if n < 2 then
    if now() > coalesce(g.last_move_at, g.created_at) + (case when g.time_control = '1d' then interval '1 day' else interval '60 seconds' end) then
      return private.finish_game(g.id, case when white_turn then '0-1' else '1-0' end, 'El rival no hizo su primera jugada');
    end if;
    return g;
  end if;
  left_ms := (case when white_turn then g.white_ms else g.black_ms end) - (extract(epoch from now() - g.last_move_at) * 1000)::int;
  if left_ms <= 0 then return private.finish_game(g.id, case when white_turn then '0-1' else '1-0' end, 'Tiempo agotado'); end if;
  return g;
end $$;

-- Cancelar: antes de que cada jugador haga su primera jugada, sin cambios de Elo
create or replace function public.game_abort(p_game uuid) returns public.games
language plpgsql security definer set search_path = public, private as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game for update;
  if g.status <> 'playing' or auth.uid() not in (g.white, g.black) then raise exception 'No puedes cancelar esta partida'; end if;
  if coalesce(array_length(g.moves, 1), 0) >= 2 then raise exception 'Ya no se puede cancelar: ríndete u ofrece tablas'; end if;
  if g.tournament is not null then raise exception 'En los torneos no se pueden cancelar partidas'; end if;
  update public.games set status = 'finished', result = null, reason = 'Partida cancelada', rating_change = 0, updated_at = now() where id = g.id returning * into g;
  return g;
end $$;

create or replace function public.game_resign(p_game uuid) returns public.games
language plpgsql security definer set search_path = public, private as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game;
  if g.status <> 'playing' or auth.uid() not in (g.white, g.black) then raise exception 'No puedes rendirte en esta partida'; end if;
  return private.finish_game(g.id, case when auth.uid() = g.white then '0-1' else '1-0' end, 'Abandono');
end $$;

-- Proponer tablas o aceptar las del rival
create or replace function public.game_draw(p_game uuid) returns public.games
language plpgsql security definer set search_path = public, private as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game for update;
  if g.status <> 'playing' or auth.uid() not in (g.white, g.black) then raise exception 'No puedes proponer tablas aquí'; end if;
  if g.draw_offer is not null and g.draw_offer <> auth.uid() then return private.finish_game(g.id, '1/2-1/2', 'Tablas de mutuo acuerdo'); end if;
  update public.games set draw_offer = auth.uid(), updated_at = now() where id = g.id returning * into g;
  return g;
end $$;

-- ---------------------------------------------------------------------
-- Retos entre amigos: uno crea un código y el otro lo acepta
-- ---------------------------------------------------------------------
create table if not exists public.challenges (
  code text primary key,
  creator uuid not null references auth.users (id) on delete cascade,
  time_control text not null,
  color text not null default 'random' check (color in ('w', 'b', 'random')),
  game uuid references public.games (id),
  created_at timestamptz not null default now()
);
alter table public.challenges add column if not exists variant text not null default 'standard';
alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;

drop function if exists public.challenge_create(text, text);
create or replace function public.challenge_create(p_tc text, p_color text default 'random', p_variant text default 'standard') returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare c text; v text := private.valid_variant(p_variant);
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p_tc not in ('10+0', '5+3', '3+2', '1+0', '15+10', '1d') then raise exception 'Ritmo no válido'; end if;
  if p_color not in ('w', 'b', 'random') then raise exception 'Color no válido'; end if;
  perform private.assert_fair();
  delete from public.challenges where (creator = auth.uid() and game is null) or created_at < now() - interval '1 day';
  loop
    -- Código corto y fácil de dictar (sin 0/O ni 1/I)
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.challenges where code = c);
  end loop;
  insert into public.challenges (code, creator, time_control, color, variant) values (c, auth.uid(), p_tc, p_color, v);
  return jsonb_build_object('code', c);
end $$;

-- Estado del reto (para quien lo creó: espera hasta que haya partida)
create or replace function public.challenge_status(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ch public.challenges; who text;
begin
  select * into ch from public.challenges where code = upper(trim(p_code));
  if ch.code is null then return jsonb_build_object('found', false); end if;
  select username into who from public.profiles where id = ch.creator;
  return jsonb_build_object('found', true, 'game', ch.game, 'time_control', ch.time_control, 'variant', ch.variant, 'creator', who, 'mine', ch.creator = auth.uid());
end $$;

create or replace function public.challenge_accept(p_code text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare ch public.challenges; g public.games; t record; w uuid; b uuid;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  select * into ch from public.challenges where code = upper(trim(p_code)) for update;
  if ch.code is null then raise exception 'Ese código no existe o ha caducado'; end if;
  if ch.game is not null then return jsonb_build_object('game', ch.game); end if;
  if ch.creator = auth.uid() then raise exception 'No puedes aceptar tu propio reto: pásale el código a tu amigo'; end if;
  perform private.assert_fair();
  if ch.time_control <> '1d' and exists (select 1 from public.games where status = 'playing' and time_control <> '1d' and auth.uid() in (white, black)) then raise exception 'Ya tienes una partida en juego'; end if;
  t := private.tc_ms(ch.time_control);
  if ch.color = 'w' or (ch.color = 'random' and random() < 0.5) then w := ch.creator; b := auth.uid(); else w := auth.uid(); b := ch.creator; end if;
  insert into public.games (white, black, time_control, base_ms, inc_ms, white_ms, black_ms, white_rating, black_rating, variant, start_fen)
    values (w, b, ch.time_control, t.base_ms, t.inc_ms, t.base_ms, t.base_ms,
      (select rating from public.profiles where id = w), (select rating from public.profiles where id = b),
      ch.variant, case when ch.variant = 'chess960' then private.fen960() end)
    returning * into g;
  update public.challenges set game = g.id where code = ch.code;
  delete from public.mm_queue where user_id in (w, b);
  return jsonb_build_object('game', g.id);
end $$;

create or replace function public.challenge_cancel() returns void
language sql security definer set search_path = public as $$
  delete from public.challenges where creator = auth.uid() and game is null;
$$;

-- ---------------------------------------------------------------------
-- Torneos online programados (formato arena)
-- Durante el torneo, al terminar una partida te emparejan con otro jugador.
-- Victoria 2 puntos, tablas 1. Con dos victorias seguidas, los puntos se doblan.
-- ---------------------------------------------------------------------
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  time_control text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (name, starts_at)
);
alter table public.tournaments enable row level security;
drop policy if exists "torneos visibles" on public.tournaments;
create policy "torneos visibles" on public.tournaments for select using (true);
revoke insert, update, delete on public.tournaments from anon, authenticated;
grant select on public.tournaments to anon, authenticated;

create table if not exists public.tournament_players (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  points int not null default 0,
  games int not null default 0,
  wins int not null default 0,
  streak int not null default 0,
  active boolean not null default true,
  waiting_since timestamptz,
  last_seen timestamptz,
  last_opponent uuid,
  joined_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
alter table public.tournament_players enable row level security;
drop policy if exists "clasificaciones visibles" on public.tournament_players;
create policy "clasificaciones visibles" on public.tournament_players for select using (true);
revoke insert, update, delete on public.tournament_players from anon, authenticated;
grant select on public.tournament_players to anon, authenticated;

alter table public.games add column if not exists tournament uuid references public.tournaments (id);

-- Calendario fijo (hora de Madrid): se rellena solo para los próximos 7 días
create or replace function private.tour_ensure() returns void
language plpgsql security definer set search_path = public, private as $$
declare d date; base date := (now() at time zone 'Europe/Madrid')::date; s timestamptz;
begin
  for i in 0..7 loop
    d := base + i;
    s := (d + time '21:00') at time zone 'Europe/Madrid';
    insert into public.tournaments (name, description, time_control, starts_at, ends_at)
      values ('Arena Noctua', 'El torneo de cada noche. Una hora de partidas blitz.', '3+2', s, s + interval '60 minutes') on conflict do nothing;
    if extract(isodow from d) = 3 then
      s := (d + time '19:00') at time zone 'Europe/Madrid';
      insert into public.tournaments (name, description, time_control, starts_at, ends_at)
        values ('Arena Bala', 'Media hora de partidas de un minuto.', '1+0', s, s + interval '30 minutes') on conflict do nothing;
    end if;
    if extract(isodow from d) = 7 then
      s := (d + time '18:00') at time zone 'Europe/Madrid';
      insert into public.tournaments (name, description, time_control, starts_at, ends_at)
        values ('Gran Arena del Domingo', 'El torneo grande de la semana. Hora y media de 5+3.', '5+3', s, s + interval '90 minutes') on conflict do nothing;
    end if;
  end loop;
end $$;

-- Torneos en juego, próximos y recientes
create or replace function public.tour_list() returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.tour_ensure();
  return coalesce((
    select jsonb_agg(x order by x.starts_at) from (
      select t.*, (select count(*) from public.tournament_players p where p.tournament_id = t.id) as players,
        exists (select 1 from public.tournament_players p where p.tournament_id = t.id and p.user_id = auth.uid() and p.active) as joined,
        (select u.username from public.tournament_players p join public.profiles u on u.id = p.user_id
           where p.tournament_id = t.id and t.ends_at < now() and p.games > 0 order by p.points desc, p.wins desc, p.joined_at limit 1) as winner
      from public.tournaments t
      where t.ends_at > now() - interval '2 days' and t.starts_at < now() + interval '3 days'
    ) x), '[]'::jsonb);
end $$;

create or replace function public.tour_join(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  select * into t from public.tournaments where id = p_id;
  if t.id is null then raise exception 'Ese torneo no existe'; end if;
  if now() > t.ends_at then raise exception 'El torneo ya ha terminado'; end if;
  insert into public.tournament_players (tournament_id, user_id) values (p_id, auth.uid())
    on conflict (tournament_id, user_id) do update set active = true;
end $$;

create or replace function public.tour_leave(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.tournament_players set active = false, waiting_since = null where tournament_id = p_id and user_id = auth.uid();
$$;

-- Buscar rival dentro del torneo. La web lo llama cada 2 s mientras esperas.
create or replace function public.tour_pair(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare t public.tournaments; me public.tournament_players; opp public.tournament_players; g public.games; existing public.games; tc record; w uuid; b uuid;
begin
  select * into t from public.tournaments where id = p_id;
  select * into me from public.tournament_players where tournament_id = p_id and user_id = auth.uid() for update;
  if me.user_id is null or not me.active then raise exception 'No estás apuntado a este torneo'; end if;
  perform private.assert_fair();
  select * into existing from public.games where status = 'playing' and time_control <> '1d' and auth.uid() in (white, black) order by created_at desc limit 1;
  if existing.id is not null then return jsonb_build_object('game', existing.id); end if;
  if now() < t.starts_at then return jsonb_build_object('state', 'not_started'); end if;
  -- En el último minuto no empiezan partidas nuevas
  if now() > t.ends_at - interval '1 minute' then return jsonb_build_object('state', 'finished'); end if;
  update public.tournament_players set waiting_since = coalesce(waiting_since, now()), last_seen = now() where tournament_id = p_id and user_id = me.user_id;
  select p.* into opp from public.tournament_players p
    where p.tournament_id = p_id and p.user_id <> me.user_id and p.active and p.waiting_since is not null and p.last_seen > now() - interval '8 seconds'
      and not exists (select 1 from public.games x where x.status = 'playing' and x.time_control <> '1d' and p.user_id in (x.white, x.black))
    order by (p.user_id = me.last_opponent and p.last_opponent = me.user_id), abs(p.points - me.points), p.waiting_since
    limit 1 for update skip locked;
  if opp.user_id is null then return jsonb_build_object('state', 'waiting'); end if;
  tc := private.tc_ms(t.time_control);
  if random() < 0.5 then w := me.user_id; b := opp.user_id; else w := opp.user_id; b := me.user_id; end if;
  insert into public.games (white, black, time_control, base_ms, inc_ms, white_ms, black_ms, white_rating, black_rating, tournament)
    values (w, b, t.time_control, tc.base_ms, tc.inc_ms, tc.base_ms, tc.base_ms,
      (select rating from public.profiles where id = w), (select rating from public.profiles where id = b), t.id)
    returning * into g;
  update public.tournament_players set waiting_since = null, last_opponent = opp.user_id where tournament_id = p_id and user_id = me.user_id;
  update public.tournament_players set waiting_since = null, last_opponent = me.user_id where tournament_id = p_id and user_id = opp.user_id;
  delete from public.mm_queue where user_id in (w, b);
  return jsonb_build_object('game', g.id);
end $$;

-- Suma los puntos de una partida de torneo (la llama finish_game)
create or replace function private.tour_score(g public.games) returns void
language plpgsql security definer set search_path = public, private as $$
declare t public.tournaments; side uuid; sc numeric; p public.tournament_players; pts int;
begin
  select * into t from public.tournaments where id = g.tournament;
  if t.id is null or g.created_at > t.ends_at then return; end if;
  foreach side in array array[g.white, g.black] loop
    select * into p from public.tournament_players where tournament_id = t.id and user_id = side for update;
    if p.user_id is null then continue; end if;
    sc := case when g.result = '1/2-1/2' then 0.5 when (g.result = '1-0') = (side = g.white) then 1 else 0 end;
    pts := case when sc = 1 then 2 when sc = 0.5 then 1 else 0 end * case when p.streak >= 2 and sc > 0 then 2 else 1 end;
    update public.tournament_players set points = points + pts, games = games + 1, wins = wins + (sc = 1)::int,
      streak = case when sc = 1 then streak + 1 else 0 end
      where tournament_id = t.id and user_id = side;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Perfiles públicos: biografía, logros y resumen de partidas
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists achievements text[] not null default '{}';

create or replace function public.update_bio(p_bio text) returns void
language sql security definer set search_path = public as $$
  update public.profiles set bio = left(trim(coalesce(p_bio, '')), 240) where id = auth.uid();
$$;

-- La web guarda aquí los logros conseguidos para mostrarlos en el perfil
create or replace function public.sync_achievements(p_ids text[]) returns void
language sql security definer set search_path = public as $$
  update public.profiles set achievements = (
    select coalesce(array_agg(distinct x order by x), '{}') from unnest(achievements || p_ids) x where x ~ '^[a-z0-9-]{2,30}$'
  ) where id = auth.uid() and coalesce(array_length(p_ids, 1), 0) <= 100;
$$;

create or replace function public.profile_public(p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.profiles; res jsonb;
begin
  select * into p from public.profiles where lower(username) = lower(trim(p_username));
  if p.id is null then return null; end if;
  select jsonb_build_object(
    'profile', jsonb_build_object('id', p.id, 'username', p.username, 'country', p.country, 'rating', p.rating, 'games', p.games,
       'status', p.status, 'member_number', p.waitlist_number, 'created_at', p.created_at, 'bio', p.bio, 'achievements', to_jsonb(p.achievements)),
    'record', (select jsonb_build_object(
        'wins', count(*) filter (where (result = '1-0' and white = p.id) or (result = '0-1' and black = p.id)),
        'draws', count(*) filter (where result = '1/2-1/2'),
        'losses', count(*) filter (where (result = '0-1' and white = p.id) or (result = '1-0' and black = p.id)),
        'peak', greatest(p.rating, coalesce(max(case when white = p.id then white_rating + greatest(rating_change, 0) else black_rating + greatest(-rating_change, 0) end), p.rating)))
      from public.games where status = 'finished' and p.id in (white, black)),
    'history', coalesce((select jsonb_agg(r order by r.at) from (
        select updated_at as at, case when white = p.id then white_rating + coalesce(rating_change, 0) else black_rating - coalesce(rating_change, 0) end as rating
        from public.games where status = 'finished' and result is not null and p.id in (white, black) order by updated_at desc limit 40) r), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(r order by r.at desc) from (
        select g.id, g.updated_at as at, g.time_control, g.result, g.reason, g.moves, g.start_fen, g.white = p.id as white,
          case when g.white = p.id then g.rating_change else -g.rating_change end as change,
          o.username as opponent, case when g.white = p.id then g.black_rating else g.white_rating end as opponent_rating
        from public.games g join public.profiles o on o.id = case when g.white = p.id then g.black else g.white end
        where g.status = 'finished' and g.result is not null and p.id in (g.white, g.black) order by g.updated_at desc limit 10) r), '[]'::jsonb),
    'medals', coalesce((select jsonb_agg(m order by m.at desc) from (
        select t.name, t.starts_at as at, x.rank, x.points from public.tournaments t
        join lateral (select tp.user_id, tp.points, rank() over (order by tp.points desc, tp.wins desc) as rank
                      from public.tournament_players tp where tp.tournament_id = t.id and tp.games > 0) x on x.user_id = p.id
        where t.ends_at < now() and x.rank <= 3) m), '[]'::jsonb),
    'playing', (select g.id from public.games g where g.status = 'playing' and p.id in (g.white, g.black) limit 1)
  ) into res;
  return res;
end $$;

-- ---------------------------------------------------------------------
-- Problemas: contrarreloj y problema del día con clasificación
-- ---------------------------------------------------------------------
create table if not exists public.puzzle_scores (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('rush', 'daily')),
  day date not null default (now() at time zone 'UTC')::date,
  score int not null default 0,
  seconds int,
  mistakes int,
  created_at timestamptz not null default now()
);
create unique index if not exists puzzle_scores_daily on public.puzzle_scores (user_id, day) where kind = 'daily';
create index if not exists puzzle_scores_board on public.puzzle_scores (kind, day);
alter table public.puzzle_scores enable row level security;
revoke all on public.puzzle_scores from anon, authenticated;

create or replace function public.puzzle_submit_rush(p_score int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p_score < 0 or p_score > 80 then raise exception 'Puntuación no válida'; end if;
  -- Un contrarreloj dura como mucho 3 minutos: no se aceptan envíos seguidos
  if exists (select 1 from public.puzzle_scores where user_id = auth.uid() and kind = 'rush' and created_at > now() - interval '45 seconds') then return; end if;
  insert into public.puzzle_scores (user_id, kind, score) values (auth.uid(), 'rush', p_score);
end $$;

create or replace function public.puzzle_submit_daily(p_seconds int, p_mistakes int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p_seconds < 1 or p_seconds > 86400 or p_mistakes < 0 or p_mistakes > 20 then raise exception 'Resultado no válido'; end if;
  insert into public.puzzle_scores (user_id, kind, seconds, mistakes, score) values (auth.uid(), 'daily', p_seconds, p_mistakes, case when p_mistakes = 0 then 1 else 0 end)
    on conflict (user_id, day) where kind = 'daily' do nothing;
end $$;

create or replace function public.puzzle_board() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'daily', coalesce((select jsonb_agg(x) from (
      select p.username, s.seconds, s.mistakes from public.puzzle_scores s join public.profiles p on p.id = s.user_id
      where s.kind = 'daily' and s.day = (now() at time zone 'UTC')::date order by s.mistakes, s.seconds, s.created_at limit 20) x), '[]'::jsonb),
    'daily_count', (select count(*) from public.puzzle_scores where kind = 'daily' and day = (now() at time zone 'UTC')::date),
    'rush_today', coalesce((select jsonb_agg(x) from (
      select p.username, max(s.score) as score from public.puzzle_scores s join public.profiles p on p.id = s.user_id
      where s.kind = 'rush' and s.day = (now() at time zone 'UTC')::date group by p.username order by max(s.score) desc limit 10) x), '[]'::jsonb),
    'rush_week', coalesce((select jsonb_agg(x) from (
      select p.username, max(s.score) as score from public.puzzle_scores s join public.profiles p on p.id = s.user_id
      where s.kind = 'rush' and s.day > (now() at time zone 'UTC')::date - 7 group by p.username order by max(s.score) desc limit 10) x), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------
-- Amigos, presencia y chat de partida
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.challenges add column if not exists target uuid references auth.users (id) on delete cascade;

create table if not exists public.friendships (
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;

create or replace function public.presence_ping() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_seen = now() where id = auth.uid();
$$;

create or replace function public.friend_request(p_username text) returns text
language plpgsql security definer set search_path = public as $$
declare other uuid;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  select id into other from public.profiles where lower(username) = lower(trim(p_username));
  if other is null then raise exception 'No existe ningún jugador con ese nombre'; end if;
  if other = auth.uid() then raise exception 'No puedes añadirte a ti mismo'; end if;
  -- Si el otro ya me lo había pedido, se acepta directamente
  if exists (select 1 from public.friendships where requester = other and addressee = auth.uid()) then
    update public.friendships set status = 'accepted' where requester = other and addressee = auth.uid();
    return 'accepted';
  end if;
  if (select count(*) from public.friendships where requester = auth.uid() and status = 'pending') >= 30 then raise exception 'Tienes demasiadas solicitudes pendientes'; end if;
  insert into public.friendships (requester, addressee) values (auth.uid(), other) on conflict do nothing;
  return 'pending';
end $$;

create or replace function public.friend_respond(p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update public.friendships set status = 'accepted' where requester = p_user and addressee = auth.uid();
  else
    delete from public.friendships where requester = p_user and addressee = auth.uid();
  end if;
end $$;

create or replace function public.friend_remove(p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.friendships where (requester = auth.uid() and addressee = p_user) or (requester = p_user and addressee = auth.uid());
$$;

create or replace function public.friend_list() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'friends', coalesce((select jsonb_agg(x order by x.online desc, x.username) from (
      select p.id, p.username, p.rating, coalesce(p.last_seen > now() - interval '2 minutes', false) as online,
        (select g.id from public.games g where g.status = 'playing' and p.id in (g.white, g.black) limit 1) as playing
      from public.friendships f join public.profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
      where f.status = 'accepted' and auth.uid() in (f.requester, f.addressee)) x), '[]'::jsonb),
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'rating', p.rating))
      from public.friendships f join public.profiles p on p.id = f.requester where f.addressee = auth.uid() and f.status = 'pending'), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username))
      from public.friendships f join public.profiles p on p.id = f.addressee where f.requester = auth.uid() and f.status = 'pending'), '[]'::jsonb),
    'challenges', coalesce((select jsonb_agg(jsonb_build_object('code', c.code, 'username', p.username, 'time_control', c.time_control, 'variant', c.variant))
      from public.challenges c join public.profiles p on p.id = c.creator
      where c.target = auth.uid() and c.game is null and c.created_at > now() - interval '30 minutes'), '[]'::jsonb)
  );
$$;

-- Retar directamente a un amigo (le aparece en su lista)
drop function if exists public.friend_challenge(uuid, text);
create or replace function public.friend_challenge(p_user uuid, p_tc text, p_variant text default 'standard') returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare r jsonb;
begin
  if not exists (select 1 from public.friendships where status = 'accepted' and ((requester = auth.uid() and addressee = p_user) or (requester = p_user and addressee = auth.uid()))) then
    raise exception 'Solo puedes retar directamente a tus amigos';
  end if;
  r := public.challenge_create(p_tc, 'random', p_variant);
  update public.challenges set target = p_user where code = r ->> 'code';
  return r;
end $$;

create table if not exists public.game_messages (
  id bigserial primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists game_messages_game on public.game_messages (game_id, id);
alter table public.game_messages enable row level security;
drop policy if exists "chat de mis partidas" on public.game_messages;
create policy "chat de mis partidas" on public.game_messages for select
  using (exists (select 1 from public.games g where g.id = game_id and auth.uid() in (g.white, g.black)));
revoke insert, update, delete on public.game_messages from anon, authenticated;
grant select on public.game_messages to authenticated;
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.game_messages; exception when duplicate_object then null; end;
  end if;
end $$;

create or replace function public.game_chat(p_game uuid, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare t text := trim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
begin
  if not exists (select 1 from public.games where id = p_game and auth.uid() in (white, black)) then raise exception 'Solo los jugadores pueden escribir en esta partida'; end if;
  if char_length(t) = 0 then return; end if;
  if exists (select 1 from public.game_messages where game_id = p_game and user_id = auth.uid() and created_at > now() - interval '1 second') then raise exception 'Espera un momento antes de escribir otra vez'; end if;
  if (select count(*) from public.game_messages where game_id = p_game and user_id = auth.uid()) >= 60 then raise exception 'Has llegado al límite de mensajes de esta partida'; end if;
  insert into public.game_messages (game_id, user_id, body) values (p_game, auth.uid(), left(t, 200));
end $$;

-- ---------------------------------------------------------------------
-- Juego limpio (antitrampas)
-- 1) La web de cada jugador comprueba con chess.js todas las jugadas del rival.
--    Si llega una jugada ilegal o un final falso, reclama: la partida se anula (sin Elo).
-- 2) Al terminar, la web del rival analiza la partida con Stockfish y envía la
--    precisión y el % de jugadas iguales a las del motor.
-- 3) Se guardan los tiempos de cada jugada y las salidas de la pestaña.
-- Todo se revisa en private.fair_review (SQL Editor). Para suspender a alguien:
--   update public.profiles set banned = true where username = 'nombre';
-- ---------------------------------------------------------------------
create table if not exists private.fair_reports (
  game_id uuid not null references public.games (id) on delete cascade,
  reporter uuid not null references auth.users (id) on delete cascade,
  white_acc numeric, black_acc numeric, white_match numeric, black_match numeric,
  created_at timestamptz not null default now(),
  primary key (game_id, reporter)
);

create or replace function public.game_focus_lost(p_game uuid) returns void
language sql security definer set search_path = public as $$
  update public.games set
    white_blur = white_blur + (auth.uid() = white)::int,
    black_blur = black_blur + (auth.uid() = black)::int
  where id = p_game and status = 'playing' and auth.uid() in (white, black);
$$;

create or replace function public.game_dispute(p_game uuid, p_reason text) returns public.games
language plpgsql security definer set search_path = public, private as $$
declare g public.games; c int;
begin
  select * into g from public.games where id = p_game for update;
  if g.id is null or auth.uid() not in (g.white, g.black) then raise exception 'No puedes reclamar en esta partida'; end if;
  if g.disputed_by is not null then return g; end if;
  -- Se deshace el cambio de Elo si la partida ya había terminado
  c := coalesce(g.rating_change, 0);
  if g.status = 'finished' and c <> 0 then
    update public.profiles set rating = rating - c where id = g.white;
    update public.profiles set rating = rating + c where id = g.black;
  end if;
  update public.games set status = 'finished', result = null, rating_change = 0, disputed_by = auth.uid(),
    dispute_reason = left(coalesce(p_reason, ''), 200), reason = 'Partida anulada: jugada no válida', updated_at = now()
    where id = g.id returning * into g;
  return g;
end $$;

create or replace function public.fair_report(p_game uuid, p_white_acc numeric, p_black_acc numeric, p_white_match numeric, p_black_match numeric) returns void
language plpgsql security definer set search_path = public, private as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game;
  if g.id is null or g.status <> 'finished' or auth.uid() not in (g.white, g.black) then return; end if;
  if coalesce(array_length(g.moves, 1), 0) < 40 then return; end if;
  insert into private.fair_reports (game_id, reporter, white_acc, black_acc, white_match, black_match)
    values (p_game, auth.uid(), least(greatest(p_white_acc, 0), 100), least(greatest(p_black_acc, 0), 100), least(greatest(p_white_match, 0), 100), least(greatest(p_black_match, 0), 100))
    on conflict do nothing;
end $$;

-- Resumen por jugador para revisar a mano. "sospechoso" = muchas partidas casi perfectas.
drop view if exists private.fair_review;
create view private.fair_review as
with per_game as (
  -- Solo cuenta el informe que hizo el rival (no el propio jugador)
  select g.white as user_id, r.white_acc as acc, r.white_match as match, g.white_blur as blur, g.white_times as times
    from private.fair_reports r join public.games g on g.id = r.game_id where r.reporter = g.black
  union all
  select g.black, r.black_acc, r.black_match, g.black_blur, g.black_times
    from private.fair_reports r join public.games g on g.id = r.game_id where r.reporter = g.white
), timing as (
  select user_id, avg(t) as avg_ms, stddev_pop(t) as sd_ms from per_game, unnest(times) t where t > 0 group by user_id
)
select p.username, p.rating, p.banned, count(*) as partidas_analizadas,
  round(avg(pg.acc), 1) as precision_media, round(avg(pg.match), 1) as coincidencia_motor, round(avg(pg.blur), 1) as salidas_pestana,
  round(tm.avg_ms / 1000.0, 1) as segundos_por_jugada, round(tm.sd_ms / nullif(tm.avg_ms, 0), 2) as variacion_tiempos,
  (select count(*) from public.games x where x.disputed_by is not null and p.id in (x.white, x.black) and x.disputed_by <> p.id) as reclamaciones_en_contra,
  (select count(*) from public.games x where x.disputed_by = p.id) as reclamaciones_hechas,
  (count(*) >= 5 and avg(pg.match) > 80 and avg(pg.acc) > 93) as sospechoso
from per_game pg join public.profiles p on p.id = pg.user_id left join timing tm on tm.user_id = pg.user_id
group by p.id, p.username, p.rating, p.banned, tm.avg_ms, tm.sd_ms
order by sospechoso desc, coincidencia_motor desc;

-- ---------------------------------------------------------------------
-- Revancha: al terminar, cualquiera de los dos la ofrece; si el otro también la pide, empieza.
-- Los colores se cambian respecto a la partida anterior.
-- ---------------------------------------------------------------------
alter table public.challenges add column if not exists rematch_of uuid references public.games (id) on delete cascade;

create or replace function public.rematch_offer(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare g public.games; ch public.challenges; opp uuid; r jsonb;
begin
  select * into g from public.games where id = p_game;
  if g.id is null or auth.uid() not in (g.white, g.black) then raise exception 'No jugaste esta partida'; end if;
  if g.status <> 'finished' then raise exception 'La partida aún no ha terminado'; end if;
  if g.tournament is not null then raise exception 'En los torneos te empareja el torneo'; end if;
  opp := case when g.white = auth.uid() then g.black else g.white end;
  -- Si el rival ya la ofreció, se acepta
  select * into ch from public.challenges where rematch_of = p_game and creator = opp order by created_at desc limit 1;
  if ch.code is not null then return public.challenge_accept(ch.code); end if;
  r := public.challenge_create(g.time_control, case when g.white = auth.uid() then 'b' else 'w' end, g.variant);
  update public.challenges set target = opp, rematch_of = p_game where code = r ->> 'code';
  return r;
end $$;

create or replace function public.rematch_status(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.games; ch public.challenges;
begin
  select * into g from public.games where id = p_game;
  if g.id is null or auth.uid() not in (g.white, g.black) then return jsonb_build_object('offer', null); end if;
  select * into ch from public.challenges where rematch_of = p_game order by (game is not null) desc, created_at desc limit 1;
  if ch.code is null then return jsonb_build_object('offer', null); end if;
  return jsonb_build_object('offer', case when ch.creator = auth.uid() then 'me' else 'opp' end, 'code', ch.code, 'game', ch.game);
end $$;

-- Permisos: la web solo puede llamar a estas funciones
revoke all on all functions in schema private from anon, authenticated, public;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.adm_status, public.adm_start, public.adm_puzzle_move, public.adm_nim_move, public.adm_answer, public.adm_strike,
  public.update_profile, public.mm_find, public.mm_cancel, public.game_move, public.game_claim, public.game_resign, public.game_draw,
  public.challenge_create, public.challenge_status, public.challenge_accept, public.challenge_cancel,
  public.tour_list, public.tour_join, public.tour_leave, public.tour_pair,
  public.update_bio, public.sync_achievements, public.profile_public,
  public.puzzle_submit_rush, public.puzzle_submit_daily, public.puzzle_board,
  public.presence_ping, public.friend_request, public.friend_respond, public.friend_remove, public.friend_list, public.friend_challenge, public.game_chat,
  public.game_focus_lost, public.game_dispute, public.fair_report, public.rematch_offer, public.rematch_status, public.game_abort to authenticated;
grant execute on function public.tour_list, public.profile_public, public.puzzle_board to anon;
grant execute on function public.adm_status to anon;

-- Problemas de la prueba (generados y verificados con Stockfish 19)
insert into private.adm_puzzles (id, fen, solution, accepted, rating) values
  ('g26', '3k1r2/p5p1/4pn1p/5p1P/2P2P1b/3PP2R/6P1/1rB3K1 b - - 2 37', '["Rxc1+","Kh2","Ng4#"]'::jsonb, '[["Rxc1+"],["Ng4#"]]'::jsonb, 1120),
  ('g27', 'rn5r/p4p1p/b4kp1/8/3Pn1P1/P1pQ1P1q/8/1RB1R1K1 b - - 3 29', '["Qg3+","Kf1","Qf2#"]'::jsonb, '[["Qg3+"],["Qf2#"]]'::jsonb, 1120),
  ('g28', 'r2k1b1r/ppNbnppp/n3q3/4P3/2Q2B2/7P/PP2PRB1/R3K1N1 w Q - 1 16', '["Nxe6+"]'::jsonb, '[["Nxe6+"]]'::jsonb, 1140),
  ('g29', '2r1k2r/p1p3pp/1p2p3/1bb2p2/P7/5qP1/1P4B1/R1B1R2K b k - 1 25', '["Qh5+","Bh3","Qxh3#"]'::jsonb, '[["Qh5+"],["Qxh3#"]]'::jsonb, 1140),
  ('g30', 'rnb1kb1r/pp1p2pp/1q2pp1n/8/N3PNP1/8/PP3P1P/R1BQKB1R w kq - 9 11', '["Nxb6"]'::jsonb, '[["Nxb6"]]'::jsonb, 1150),
  ('g31', '3rkb2/ppp2p1Q/6pB/4n2p/2P1P1b1/P1NB4/1P3qPP/R1K4R b - - 5 24', '["Nxd3+","Kb1","Qxb2#"]'::jsonb, '[["Nxd3+"],["Qxb2#"]]'::jsonb, 1160),
  ('g32', 'r6r/3k2pp/8/pR3p2/3b1N2/P5PP/8/1R2K3 w - - 2 36', '["Rd5+"]'::jsonb, '[["Rd5+"]]'::jsonb, 1180),
  ('g33', '7k/2p4r/p5P1/2B4p/5P2/P2P2P1/1pP4P/1R2R1K1 w - - 4 34', '["Bd4+","Rg7","Re8#"]'::jsonb, '[["Bd4+"],["Re8#"]]'::jsonb, 1180),
  ('g34', '2r1k2r/p1p2qpp/1p2p3/1bb2p2/P7/5PP1/1P4B1/R1B1R2K b k - 2 23', '["Qh5+","Bh3","Qxh3#"]'::jsonb, '[["Qh5+"],["Qxh3#"]]'::jsonb, 1190),
  ('g35', 'r1bqkb1r/p2p1ppp/2p1pn2/nR6/P1P5/4PN2/1P1PBPPP/1NBQK2R b Kkq - 1 9', '["cxb5"]'::jsonb, '[["cxb5"]]'::jsonb, 1220),
  ('g36', '3qk2r/2pbnpp1/3p1p2/1B5p/1b1PPP2/2P5/6PP/1N1QK1NR w Kk - 1 17', '["Bxd7+","Qxd7","cxb4"]'::jsonb, '[["Bxd7+"],["cxb4"]]'::jsonb, 1230),
  ('g37', 'r1bqkb1r/1p3pp1/3p1n2/p1p1p2p/3nP3/P1NP1NPP/1PP2PBK/R1BQ2R1 b - - 4 11', '["Ng4+","Kh1","Nxf2+"]'::jsonb, '[["Ng4+"],["Nxf2+"]]'::jsonb, 1230),
  ('g38', '8/8/2P1k3/p3P3/P3R3/3P4/n6r/1K6 b - - 0 50', '["Nc3+"]'::jsonb, '[["Nc3+"]]'::jsonb, 1230),
  ('g39', '4k3/1P1r4/8/8/8/5p2/2n4r/2K5 b - - 4 59', '["Rxb7","Kd1","Rb1#"]'::jsonb, '[["Rxb7"],["Rb1#"]]'::jsonb, 1240),
  ('g40', '4kb2/2p1p3/pr6/2N1Rp1p/P2N1n1r/1P6/5P2/6K1 b - - 8 37', '["Rg6+","Kf1","Rh1#"]'::jsonb, '[["Rg6+"],["Rh1#"]]'::jsonb, 1250),
  ('g41', 'r1k2r2/1b5p/p7/1p6/4pBPp/1PNRN2P/PR3K2/8 b - - 0 30', '["Rxf4+","Kg1","exd3"]'::jsonb, '[["Rxf4+"],["exd3"]]'::jsonb, 1250),
  ('g42', 'rnbqkb1r/1p3ppp/p3pn2/2p5/3p3P/2N1PP2/PPPPB1P1/R1BQK1NR b KQkq - 1 7', '["dxc3"]'::jsonb, '[["dxc3"]]'::jsonb, 1260),
  ('g43', '2r1k2r/p1p2qpp/1pb1p3/2b2p2/P7/5PP1/1P4B1/R1B2R1K b k - 0 22', '["Qh5+","Bh3","Qxh3#"]'::jsonb, '[["Qh5+"],["Qxh3#"]]'::jsonb, 1260),
  ('g44', '2rrQ3/6pk/1qn1p3/8/p1b4P/P3P3/1RPP1PP1/1N2K2R w - - 5 31', '["Qh5+","Kg8","Rxb6"]'::jsonb, '[["Qh5+"],["Rxb6"]]'::jsonb, 1280),
  ('g45', '3rk2r/p3pp2/2p4Q/P2q4/3P4/p1P3R1/1Pn1BPP1/R1B2KN1 w k - 3 27', '["Qxh8+","Kd7","Qh3+"]'::jsonb, '[["Qxh8+"],["Qh3+"]]'::jsonb, 1290),
  ('g46', 'rnq1k2r/1pp1ppbp/3p2p1/p7/P1PP4/1P2PNPb/R4PBP/2B1KQ1R w Kkq - 3 16', '["Bxh3","Qxh3","Qxh3"]'::jsonb, '[["Bxh3"],["Qxh3"]]'::jsonb, 1380),
  ('g47', '3r2k1/1R2q1p1/3nP1bp/3p4/1QpPp2P/2P1P3/6P1/R5K1 b - - 6 38', '["Qxb7","Qxb7","Nxb7"]'::jsonb, '[["Qxb7"],["Nxb7"]]'::jsonb, 1410),
  ('g48', '1r2k2r/p3pp2/2p4Q/P2q4/3P4/p1P3R1/1Pn1BPP1/R1B2KN1 b k - 2 26', '["Rxh6","Rg8+","Kd7"]'::jsonb, '[["Rxh6"],["Kd7"]]'::jsonb, 1420),
  ('g49', '2r5/7p/2p3p1/3k1p2/Pp5P/1P1P1K2/3P3P/1R6 b - a3 0 37', '["bxa3","Ra1","Ra8"]'::jsonb, '[["bxa3"],["Ra8"]]'::jsonb, 1420),
  ('g50', '1rb1kb1r/ppqpn1pp/2n2p2/2p1p3/2P4P/P1NPP3/1P3PP1/RNBQKB1R w KQk - 3 8', '["Nb5","Qb6","Nd6+"]'::jsonb, '[["Nb5"],["Nd6+"]]'::jsonb, 1430),
  ('g51', '2kr2n1/p7/8/1p2QpPp/2qP1B2/5P2/KPn3B1/3RR3 w - - 1 26', '["b3","Qc6","Qb8+"]'::jsonb, '[["b3"],["Qb8+"]]'::jsonb, 1450),
  ('g52', 'r3k2r/ppp1bppp/4q3/4p3/1PN3B1/P2PP2P/3n1PP1/Q4RK1 b - - 1 19', '["f5","Bh5+","g6"]'::jsonb, '[["f5"],["g6"]]'::jsonb, 1480),
  ('g53', 'r2q1k1r/1p1b1np1/5p2/pBn4p/1b6/1PN2P1P/P3N1P1/1RBQ1K1R b - - 1 22', '["Bxb5","Qxd8+","Rxd8"]'::jsonb, '[["Bxb5"],["Rxd8"]]'::jsonb, 1550),
  ('g54', 'rn1qkbnr/1pp2ppp/3p4/pB2p3/8/P1N1P3/bPPP1PPP/R1BQK1R1 b Qkq - 2 8', '["c6","Rxa2","cxb5"]'::jsonb, '[["c6"],["cxb5"]]'::jsonb, 1550),
  ('g55', '2r1k2r/p1p2qpp/1pb1p3/2b2p2/P3n3/5PP1/1P4BP/R1B2R1K b k - 1 21', '["Nxg3+","hxg3","Qh5+","Bh3","Qxh3#"]'::jsonb, '[["Nxg3+"],["Qh5+"],["Qxh3#"]]'::jsonb, 1560),
  ('g56', '4kb2/2p1p3/pr6/2N1Rp1p/P2N1nr1/1P6/5P2/7K b - - 6 36', '["Rh4+","Kg1","Rg6+","Kf1","Rh1#"]'::jsonb, '[["Rh4+"],["Rg6+"],["Rh1#"]]'::jsonb, 1630)
on conflict (id) do update set fen = excluded.fen, solution = excluded.solution, accepted = excluded.accepted, rating = excluded.rating;
