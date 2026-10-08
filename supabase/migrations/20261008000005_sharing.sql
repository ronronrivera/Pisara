-- Sharing: invite links, joining, member management, and who may use a board's
-- private Realtime channel. Builds on the hardening migration (share_token is not
-- readable by clients; only the owner-only functions below return it).
-- Not-found errors use SQLSTATE PT404 so PostgREST answers HTTP 404, not 500.

-- ---------------------------------------------------------------------------
-- Invite tokens: 16 random bytes, base64url, 22 characters.
-- ---------------------------------------------------------------------------
create function public.new_share_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_')
$$;
revoke execute on function public.new_share_token() from public, anon, authenticated;

-- Owner only: the board's invite token, created on first use.
create function public.share_token_for(b uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  if public.board_role(b) is distinct from 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501', hint = 'Only the board owner can share it.';
  end if;
  select share_token into token from public.boards where id = b for update;
  if token is null then
    token := public.new_share_token();
    update public.boards set share_token = token where id = b;
  end if;
  return token;
end;
$$;

-- Owner only: replace the token, so every previously shared link stops working.
create function public.rotate_share_token(b uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := public.new_share_token();
begin
  if public.board_role(b) is distinct from 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501', hint = 'Only the board owner can reset the link.';
  end if;
  update public.boards set share_token = token where id = b;
  return token;
end;
$$;

-- What an invite link points to, so the join page can say "Ana invited you to ..."
-- before the visitor signs in. Knowing the token is what grants this.
create function public.peek_invite(token text)
returns table (board_id uuid, title text, owner_name text, link_role public.member_role)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.title, p.display_name, b.link_role
  from public.boards b
  join public.profiles p on p.id = b.owner_id
  where b.share_token = peek_invite.token
    and b.visibility <> 'private'
$$;

-- Join through a link. Existing members keep their role (a link never downgrades).
create function public.join_board(token text)
returns table (board_id uuid, role public.member_role)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  target public.boards;
  existing public.member_role;
  members integer;
begin
  if uid is null then
    raise exception 'FORBIDDEN' using errcode = '42501', hint = 'Sign in or pick a guest name first.';
  end if;

  select * into target from public.boards b
  where b.share_token = join_board.token and b.visibility <> 'private';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'PT404', hint = 'This invite link is invalid or has been turned off.';
  end if;

  select m.role into existing from public.board_members m where m.board_id = target.id and m.user_id = uid;
  if existing is null then
    select count(*) into members from public.board_members m where m.board_id = target.id;
    if members >= 50 then
      raise exception 'BOARD_FULL' using errcode = 'P0001', hint = 'This board already has 50 members.';
    end if;
    insert into public.board_members (board_id, user_id, role) values (target.id, uid, target.link_role);
    existing := target.link_role;
  end if;

  return query select target.id, existing;
end;
$$;

-- Owner only: make someone an editor or a viewer.
create function public.set_member_role(b uuid, member uuid, new_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.board_role(b) is distinct from 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501', hint = 'Only the board owner can change roles.';
  end if;
  if new_role = 'owner' then
    raise exception 'FORBIDDEN' using errcode = '42501', hint = 'Ownership cannot be handed over this way.';
  end if;
  update public.board_members m set role = new_role
  where m.board_id = b and m.user_id = member and m.role <> 'owner';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'PT404', hint = 'That person is not a member of this board.';
  end if;
end;
$$;

-- The owner can remove anyone else; any other member can remove themselves (leave).
create function public.remove_member(b uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller public.member_role := public.board_role(b);
begin
  if caller is null or (caller <> 'owner' and member <> auth.uid()) then
    raise exception 'FORBIDDEN' using errcode = '42501', hint = 'You can only remove yourself.';
  end if;
  delete from public.board_members m where m.board_id = b and m.user_id = member and m.role <> 'owner';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'PT404', hint = 'Owners cannot leave their own board; delete it instead.';
  end if;
end;
$$;

revoke execute on function public.share_token_for(uuid) from public, anon;
revoke execute on function public.rotate_share_token(uuid) from public, anon;
revoke execute on function public.join_board(text) from public, anon;
revoke execute on function public.set_member_role(uuid, uuid, public.member_role) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.share_token_for(uuid) to authenticated;
grant execute on function public.rotate_share_token(uuid) to authenticated;
grant execute on function public.join_board(text) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
-- Invite previews work before signing in, on purpose.
revoke execute on function public.peek_invite(text) from public;
grant execute on function public.peek_invite(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: each board has one private channel, "board:<uuid>".
--   * every member may listen and appear in presence (who's online)
--   * only owners and editors may broadcast (strokes, shapes, cursors)
-- Authorization is checked when a client joins the channel.
-- ---------------------------------------------------------------------------
create function public.board_id_from_topic(topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select substr(topic, 7)::uuid
  where topic ~ '^board:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$$;
revoke execute on function public.board_id_from_topic(text) from public, anon;
grant execute on function public.board_id_from_topic(text) to authenticated; -- evaluated inside policies

create policy "board members can listen"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.board_role(public.board_id_from_topic((select realtime.topic()))) is not null
  );

create policy "board members can share presence"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and public.board_role(public.board_id_from_topic((select realtime.topic()))) is not null
  );

create policy "editors can broadcast"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and public.board_role(public.board_id_from_topic((select realtime.topic()))) in ('owner', 'editor')
  );
