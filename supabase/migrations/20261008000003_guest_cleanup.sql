-- Delete abandoned guest accounts so auth.users doesn't fill up with one-off visitors.
-- A guest is removed after 30 days without signing in, as long as they own no boards.

create extension if not exists pg_cron;

create function public.delete_stale_guests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from auth.users u
  where u.is_anonymous
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
    and not exists (select 1 from public.boards b where b.owner_id = u.id);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Only the scheduler (running as postgres) may call this.
revoke execute on function public.delete_stale_guests() from public, anon, authenticated;

select cron.schedule('delete-stale-guests', '17 3 * * *', 'select public.delete_stale_guests()');
