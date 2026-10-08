-- Profiles: one row per auth user (guest or signed in), created by a trigger.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  is_guest     boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any signed-in user (guests included) can read profiles, so collaborators'
-- names and avatars can be shown. Tighten to "people I share a board with"
-- once board_members exists.
create policy "authenticated users read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can rename themselves. is_guest and avatar_url are managed by triggers.
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Pick the best available name from sign-up metadata:
-- guests pass display_name; Google sends full_name/name; GitHub sends user_name too.
create function public.profile_name_from_meta(meta jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    coalesce(
      nullif(trim(meta ->> 'display_name'), ''),
      nullif(trim(meta ->> 'full_name'), ''),
      nullif(trim(meta ->> 'name'), ''),
      nullif(trim(meta ->> 'user_name'), ''),
      'Guest'
    ),
    40
  )
$$;

create function public.handle_new_user()
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
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A guest who links Google or GitHub keeps the same user id (and every board),
-- but stops being a guest and picks up the provider's avatar.
create function public.handle_user_upgraded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set is_guest   = false,
      avatar_url = coalesce(new.raw_user_meta_data ->> 'avatar_url', avatar_url)
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_upgraded
  after update of is_anonymous on auth.users
  for each row
  when (old.is_anonymous is true and new.is_anonymous is false)
  execute function public.handle_user_upgraded();
