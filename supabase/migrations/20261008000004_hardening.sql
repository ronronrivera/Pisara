-- Security hardening from a Supabase Security Advisor pass and a manual review.

-- ---------------------------------------------------------------------------
-- 1. Internal functions are not part of the API.
--    Trigger functions can't actually be invoked over RPC, but nobody should hold
--    EXECUTE on them either. board_role / create_board / shares_board_with stay
--    callable by signed-in users on purpose: RLS policies and the app depend on them.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_upgraded() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.profile_name_from_meta(jsonb) from public, anon, authenticated;

-- Supabase-managed event trigger (auto-enables RLS on new tables). Keep it working,
-- just don't expose it. It only exists on hosted projects.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Signed-out visitors never touch tables directly (guests are signed in).
--    RLS already returns nothing to them; this removes the access entirely.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.boards, public.board_members from anon;

-- ---------------------------------------------------------------------------
-- 3. Invite tokens are secret. A viewer who could read share_token could join via
--    the link with the link's (possibly editor) role. Only owner-only functions
--    (added with sharing) will ever return it.
-- ---------------------------------------------------------------------------
revoke select on public.boards from authenticated;
grant select (id, owner_id, title, visibility, link_role, thumbnail_url, created_at, updated_at)
  on public.boards to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Names and titles: no control characters or bidirectional overrides, which can
--    make one name render as another ("Ana" vs a reversed lookalike).
-- ---------------------------------------------------------------------------
create function public.strip_unsafe_chars(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(value, '[\u0001-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]', '', 'g')
$$;
-- CHECK constraints run with the caller's privileges, so signed-in users must be able to
-- execute this (it's a pure text function). Signed-out visitors never write.
revoke execute on function public.strip_unsafe_chars(text) from public, anon;
grant execute on function public.strip_unsafe_chars(text) to authenticated;

update public.profiles set display_name = coalesce(nullif(public.strip_unsafe_chars(display_name), ''), 'Guest')
where display_name <> public.strip_unsafe_chars(display_name);
update public.boards set title = coalesce(nullif(public.strip_unsafe_chars(title), ''), 'Untitled board')
where title <> public.strip_unsafe_chars(title);

alter table public.profiles
  add constraint display_name_safe_chars check (display_name = public.strip_unsafe_chars(display_name));
alter table public.boards
  add constraint title_safe_chars check (title = public.strip_unsafe_chars(title));

create or replace function public.profile_name_from_meta(meta jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    coalesce(
      nullif(trim(public.strip_unsafe_chars(meta ->> 'display_name')), ''),
      nullif(trim(public.strip_unsafe_chars(meta ->> 'full_name')), ''),
      nullif(trim(public.strip_unsafe_chars(meta ->> 'name')), ''),
      nullif(trim(public.strip_unsafe_chars(meta ->> 'user_name')), ''),
      'Guest'
    ),
    40
  )
$$;
revoke execute on function public.profile_name_from_meta(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Avatars: sign-up metadata is user-controlled, so an arbitrary avatar_url would make
--    every collaborator's browser request an attacker's URL (tracking, IP leaks).
--    Only GitHub and Google avatar hosts are accepted.
-- ---------------------------------------------------------------------------
create function public.safe_avatar_url(url text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when url ~ '^https://(avatars\.githubusercontent\.com|[a-z0-9-]+\.googleusercontent\.com)/[^\s"''<>\\]*$' then url
  end
$$;
revoke execute on function public.safe_avatar_url(text) from public, anon;
grant execute on function public.safe_avatar_url(text) to authenticated; -- used by a CHECK constraint

update public.profiles set avatar_url = public.safe_avatar_url(avatar_url)
where avatar_url is distinct from public.safe_avatar_url(avatar_url);

alter table public.profiles
  add constraint avatar_url_allowed check (avatar_url is null or avatar_url = public.safe_avatar_url(avatar_url));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, is_guest)
  values (
    new.id,
    public.profile_name_from_meta(new.raw_user_meta_data),
    public.safe_avatar_url(new.raw_user_meta_data ->> 'avatar_url'),
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$;

create or replace function public.handle_user_upgraded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set is_guest   = false,
      avatar_url = coalesce(public.safe_avatar_url(new.raw_user_meta_data ->> 'avatar_url'), avatar_url)
  where id = new.id;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_upgraded() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Abuse limits on board creation: 10 per minute, and a total cap
--    (guests 25, accounts 500). Errors carry codes the client maps to messages.
-- ---------------------------------------------------------------------------
create or replace function public.create_board(title text default 'Untitled board')
returns public.boards
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  board public.boards;
  guest boolean;
  recent integer;
  total integer;
begin
  if uid is null then
    raise exception 'FORBIDDEN' using errcode = '42501', hint = 'Sign in before creating a board.';
  end if;

  -- Serialize per user so parallel requests cannot slip past the limits.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select count(*) filter (where created_at > now() - interval '1 minute'), count(*)
    into recent, total
    from public.boards where owner_id = uid;
  select is_guest into guest from public.profiles where id = uid;

  if recent >= 10 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001', hint = 'Too many new boards. Wait a minute and try again.';
  end if;
  -- (Plain IFs rather than CASE: the Supabase CLI statement splitter miscounts CASE ... END.)
  if coalesce(guest, true) and total >= 25 then
    raise exception 'BOARD_LIMIT' using errcode = 'P0001',
      hint = 'Guests can have up to 25 boards. Sign in with GitHub or Google to make more.';
  end if;
  if total >= 500 then
    raise exception 'BOARD_LIMIT' using errcode = 'P0001',
      hint = 'You have reached the 500-board limit. Delete some boards to make room.';
  end if;

  insert into public.boards (owner_id, title)
  values (uid, coalesce(nullif(trim(public.strip_unsafe_chars(create_board.title)), ''), 'Untitled board'))
  returning * into board;

  insert into public.board_members (board_id, user_id, role)
  values (board.id, uid, 'owner');

  return board;
end;
$$;

revoke execute on function public.create_board(text) from public, anon;
grant execute on function public.create_board(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Profile policies: evaluate auth.uid() once per query, not once per row
--    (Supabase advisor 0003_auth_rls_initplan).
-- ---------------------------------------------------------------------------
drop policy "users read own and collaborators' profiles" on public.profiles;
create policy "users read own and collaborators' profiles"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or public.shares_board_with(id));

drop policy "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
