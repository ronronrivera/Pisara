-- Boards and memberships. The owner is also a board_members row (role 'owner'),
-- so every permission check reads one table through board_role().

create type public.board_visibility as enum ('private', 'link', 'public');
create type public.member_role as enum ('owner', 'editor', 'viewer');

create table public.boards (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  title         text not null default 'Untitled board' check (char_length(title) between 1 and 80),
  visibility    public.board_visibility not null default 'link',
  share_token   text unique,                                   -- random token for invite links
  link_role     public.member_role not null default 'editor',  -- role granted via the link
  thumbnail_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint link_role_not_owner check (link_role <> 'owner')
);

create table public.board_members (
  board_id  uuid not null references public.boards (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      public.member_role not null default 'editor',
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index boards_owner_updated on public.boards (owner_id, updated_at desc);
create index board_members_user on public.board_members (user_id);

-- Keep boards.updated_at current on every change.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

-- The caller's role on a board, or null if they aren't a member.
-- security definer so policies can call it without recursing into board_members' own RLS.
create function public.board_role(b uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.board_members where board_id = b and user_id = auth.uid()
$$;

revoke execute on function public.board_role(uuid) from public, anon;
grant execute on function public.board_role(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.boards enable row level security;
alter table public.board_members enable row level security;

create policy "members read boards"
  on public.boards for select
  to authenticated
  using (public.board_role(id) is not null);

create policy "owner updates board"
  on public.boards for update
  to authenticated
  using (public.board_role(id) = 'owner')
  with check (public.board_role(id) = 'owner');

create policy "owner deletes board"
  on public.boards for delete
  to authenticated
  using (public.board_role(id) = 'owner');

-- No insert policy: boards are created only through create_board().
-- Owners may change these columns directly; owner_id and share_token are off limits
-- (share tokens will be rotated through a dedicated function).
revoke insert, update on public.boards from authenticated;
grant update (title, visibility, link_role, thumbnail_url) on public.boards to authenticated;

create policy "members read memberships"
  on public.board_members for select
  to authenticated
  using (public.board_role(board_id) is not null);

-- Memberships change only through functions (create_board now; join/leave/roles later).
revoke insert, update, delete on public.board_members from authenticated;

-- ---------------------------------------------------------------------------
-- Functions called from the client with supabase.rpc()
-- ---------------------------------------------------------------------------

create function public.create_board(title text default 'Untitled board')
returns public.boards
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  board public.boards;
begin
  if uid is null then
    raise exception 'FORBIDDEN' using errcode = '42501', hint = 'Sign in before creating a board.';
  end if;

  insert into public.boards (owner_id, title)
  values (uid, coalesce(nullif(trim(create_board.title), ''), 'Untitled board'))
  returning * into board;

  insert into public.board_members (board_id, user_id, role)
  values (board.id, uid, 'owner');

  return board;
end;
$$;

revoke execute on function public.create_board(text) from public, anon;
grant execute on function public.create_board(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: now that boards exist, only show people you share a board with.
-- ---------------------------------------------------------------------------

create function public.shares_board_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.board_members me
    join public.board_members them on them.board_id = me.board_id
    where me.user_id = auth.uid() and them.user_id = other
  )
$$;

revoke execute on function public.shares_board_with(uuid) from public, anon;
grant execute on function public.shares_board_with(uuid) to authenticated;

drop policy "authenticated users read profiles" on public.profiles;

create policy "users read own and collaborators' profiles"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.shares_board_with(id));

-- Users who signed up before the profiles migration have no profile row,
-- and boards.owner_id needs one.
insert into public.profiles (id, display_name, avatar_url, is_guest)
select u.id,
       public.profile_name_from_meta(u.raw_user_meta_data),
       u.raw_user_meta_data ->> 'avatar_url',
       coalesce(u.is_anonymous, false)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
