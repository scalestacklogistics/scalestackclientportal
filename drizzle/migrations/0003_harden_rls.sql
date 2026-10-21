
-- profiles: staff only see people they share a client with
drop policy "own profile or staff" on public.profiles;
create policy "own or related profiles" on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.client_members cm where cm.user_id = profiles.id and public.is_staff_for(cm.client_id))
  or exists (select 1 from public.team_assignments ta join public.client_members cm on cm.client_id = ta.client_id
             where ta.user_id = profiles.id and cm.user_id = auth.uid())
  or (public.has_role(profiles.id,'admin') and exists (select 1 from public.client_members where user_id = auth.uid()))
);
drop policy "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- notifications: staff may only notify users of clients they serve
drop policy "staff create notifications" on public.notifications;
create policy "scoped create notifications" on public.notifications for insert to authenticated with check (
  user_id = auth.uid()
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.client_members cm where cm.user_id = notifications.user_id and public.is_staff_for(cm.client_id))
);
create policy "staff update notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy "update own notifications" on public.notifications;

-- tickets: keep updated_at fresh; clients cannot change status (no update policy for clients)
-- milestone must belong to same client as its project
create or replace function public.tg_milestone_client() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.projects where id = new.project_id and client_id = new.client_id) then
    raise exception 'Milestone client must match project client';
  end if; return new; end $$;
create trigger milestone_client before insert or update on public.milestones for each row execute function public.tg_milestone_client();

create or replace function public.tg_payment_client() returns trigger language plpgsql security definer set search_path=public as $$
declare total numeric; inv record;
begin
  select * into inv from public.invoices where id = new.invoice_id;
  if inv.client_id is distinct from new.client_id then raise exception 'Payment client must match invoice client'; end if;
  return new; end $$;
create trigger payment_client before insert or update on public.payments for each row execute function public.tg_payment_client();

create or replace function public.tg_payment_settle() returns trigger language plpgsql security definer set search_path=public as $$
declare total numeric;
begin
  select coalesce(sum(amount),0) into total from public.payments where invoice_id = new.invoice_id;
  update public.invoices set status = 'paid' where id = new.invoice_id and total >= amount;
  return new; end $$;
create trigger payment_settle after insert on public.payments for each row execute function public.tg_payment_settle();

-- files row must point at its own client's storage folder
create or replace function public.tg_file_path() returns trigger language plpgsql set search_path=public as $$
begin
  if split_part(new.storage_path,'/',1) <> new.client_id::text then raise exception 'File path must be inside the client folder'; end if;
  return new; end $$;
create trigger file_path before insert or update on public.files for each row execute function public.tg_file_path();

-- reports file path likewise
create or replace function public.tg_report_path() returns trigger language plpgsql set search_path=public as $$
begin
  if new.file_path is not null and split_part(new.file_path,'/',1) <> new.client_id::text then raise exception 'Report file must be inside the client folder'; end if;
  return new; end $$;
create trigger report_path before insert or update on public.reports for each row execute function public.tg_report_path();

-- storage: reports files of unpublished reports are only readable by staff
drop policy "read client files" on storage.objects;
create policy "read client files" on storage.objects for select to authenticated using (
  bucket_id='client-files' and (
    public.is_staff_for(((storage.foldername(name))[1])::uuid)
    or (public.can_access_client(((storage.foldername(name))[1])::uuid)
        and (storage.foldername(name))[2] <> 'reports')
    or exists (select 1 from public.reports r where r.file_path = objects.name and r.published
               and public.can_access_client(r.client_id))
  ));

-- lock down helper functions from anon
revoke execute on function public.can_access_client(uuid) from anon, public;
revoke execute on function public.is_staff_for(uuid) from anon, public;
revoke execute on function public.has_role(uuid, app_role) from anon, public;
grant execute on function public.can_access_client(uuid) to authenticated;
grant execute on function public.is_staff_for(uuid) to authenticated;
grant execute on function public.has_role(uuid, app_role) to authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
