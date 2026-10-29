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

-- Actualizaciones en tiempo real de las partidas
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.games; exception when duplicate_object then null; end;
  end if;
end $$;

create or replace function private.tc_ms(tc text, out base_ms int, out inc_ms int) language sql immutable as $$
  select (split_part(tc, '+', 1)::int * 60000), (coalesce(nullif(split_part(tc, '+', 2), ''), '0')::int * 1000)
$$;

-- Buscar rival. Ventana de Elo que se amplía con la espera: ±100, +50 cada 10 s.
create or replace function public.mm_find(p_tc text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare me public.profiles; opp public.mm_queue; g public.games; t record; existing public.games; w uuid; b uuid;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p_tc not in ('10+0', '5+3', '3+2', '1+0', '15+10') then raise exception 'Ritmo no válido'; end if;
  select * into existing from public.games where status = 'playing' and auth.uid() in (white, black) order by created_at desc limit 1;
  if existing.id is not null then return jsonb_build_object('game', existing.id); end if;
  select * into me from public.profiles where id = auth.uid();
  delete from public.mm_queue where joined_at < now() - interval '2 minutes';
  select * into opp from public.mm_queue q
    where q.user_id <> me.id and q.time_control = p_tc
      and abs(q.rating - me.rating) <= 100 + 50 * floor(extract(epoch from now() - q.joined_at) / 10)
    order by abs(q.rating - me.rating), q.joined_at
    limit 1 for update skip locked;
  if opp.user_id is null then
    insert into public.mm_queue (user_id, rating, time_control) values (me.id, me.rating, p_tc)
      on conflict (user_id) do update set time_control = excluded.time_control, rating = excluded.rating, joined_at = case when mm_queue.time_control = excluded.time_control then mm_queue.joined_at else now() end;
    return jsonb_build_object('waiting', true);
  end if;
  delete from public.mm_queue where user_id in (opp.user_id, me.id);
  t := private.tc_ms(p_tc);
  if random() < 0.5 then w := me.id; b := opp.user_id; else w := opp.user_id; b := me.id; end if;
  insert into public.games (white, black, time_control, base_ms, inc_ms, white_ms, black_ms, white_rating, black_rating)
    values (w, b, p_tc, t.base_ms, t.inc_ms, t.base_ms, t.base_ms,
      (select rating from public.profiles where id = w), (select rating from public.profiles where id = b))
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
    if now() > coalesce(g.last_move_at, g.created_at) + interval '60 seconds' then
      return private.finish_game(g.id, case when white_turn then '0-1' else '1-0' end, 'El rival no hizo su primera jugada');
    end if;
    return g;
  end if;
  left_ms := (case when white_turn then g.white_ms else g.black_ms end) - (extract(epoch from now() - g.last_move_at) * 1000)::int;
  if left_ms <= 0 then return private.finish_game(g.id, case when white_turn then '0-1' else '1-0' end, 'Tiempo agotado'); end if;
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
alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;

create or replace function public.challenge_create(p_tc text, p_color text default 'random') returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p_tc not in ('10+0', '5+3', '3+2', '1+0', '15+10') then raise exception 'Ritmo no válido'; end if;
  if p_color not in ('w', 'b', 'random') then raise exception 'Color no válido'; end if;
  delete from public.challenges where (creator = auth.uid() and game is null) or created_at < now() - interval '1 day';
  loop
    -- Código corto y fácil de dictar (sin 0/O ni 1/I)
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.challenges where code = c);
  end loop;
  insert into public.challenges (code, creator, time_control, color) values (c, auth.uid(), p_tc, p_color);
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
  return jsonb_build_object('found', true, 'game', ch.game, 'time_control', ch.time_control, 'creator', who, 'mine', ch.creator = auth.uid());
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
  if exists (select 1 from public.games where status = 'playing' and auth.uid() in (white, black)) then raise exception 'Ya tienes una partida en juego'; end if;
  t := private.tc_ms(ch.time_control);
  if ch.color = 'w' or (ch.color = 'random' and random() < 0.5) then w := ch.creator; b := auth.uid(); else w := auth.uid(); b := ch.creator; end if;
  insert into public.games (white, black, time_control, base_ms, inc_ms, white_ms, black_ms, white_rating, black_rating)
    values (w, b, ch.time_control, t.base_ms, t.inc_ms, t.base_ms, t.base_ms,
      (select rating from public.profiles where id = w), (select rating from public.profiles where id = b))
    returning * into g;
  update public.challenges set game = g.id where code = ch.code;
  delete from public.mm_queue where user_id in (w, b);
  return jsonb_build_object('game', g.id);
end $$;

create or replace function public.challenge_cancel() returns void
language sql security definer set search_path = public as $$
  delete from public.challenges where creator = auth.uid() and game is null;
$$;

-- Permisos: la web solo puede llamar a estas funciones
revoke all on all functions in schema private from anon, authenticated, public;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.adm_status, public.adm_start, public.adm_puzzle_move, public.adm_nim_move, public.adm_answer, public.adm_strike,
  public.update_profile, public.mm_find, public.mm_cancel, public.game_move, public.game_claim, public.game_resign, public.game_draw,
  public.challenge_create, public.challenge_status, public.challenge_accept, public.challenge_cancel to authenticated;
grant execute on function public.adm_status to anon;
