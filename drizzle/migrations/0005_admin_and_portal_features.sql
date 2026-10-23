
-- Suspended clients lose portal access (staff keep access)
create or replace function public.can_access_client(_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff_for(_client)
    or exists(select 1 from public.client_members cm join public.clients c on c.id = cm.client_id
              where cm.client_id=_client and cm.user_id=auth.uid() and c.status = 'active') $$;

-- Service categories (manageable)
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null, description text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.service_categories to authenticated;
grant all on public.service_categories to service_role;
alter table public.service_categories enable row level security;
create policy "read categories" on public.service_categories for select to authenticated using (true);
create policy "admin categories" on public.service_categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.service_categories(slug,name) values
 ('website','Website Development'),('ecommerce','Shopify & E-commerce'),('marketing','Digital Marketing'),
 ('ads','Google, Meta & TikTok Ads'),('seo','SEO, GEO & AEO'),('ai','AI Chatbots & Automation'),('design','Graphic Design');
alter table public.services add column category_id uuid references public.service_categories(id);
update public.services s set category_id = c.id from public.service_categories c where c.slug = s.category::text;
alter table public.services alter column category set default 'website';
comment on column public.services.category is 'DEPRECATED: replaced by category_id';

-- Report metrics + optional link to a service category for personalization
alter table public.reports add column metrics jsonb not null default '[]'::jsonb;
alter table public.reports add column category_id uuid references public.service_categories(id);

-- Milestone tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null, assignee_id uuid, due_date date, done boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "read tasks" on public.tasks for select to authenticated using (public.can_access_client(client_id));
create policy "staff write tasks" on public.tasks for all to authenticated
  using (public.is_staff_for(client_id)) with check (public.is_staff_for(client_id));
create or replace function public.tg_task_client() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.milestones where id = new.milestone_id and client_id = new.client_id) then
    raise exception 'Task client must match milestone client'; end if; return new; end $$;
create trigger task_client before insert or update on public.tasks for each row execute function public.tg_task_client();

-- Ticket replies
create table public.ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null, body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.ticket_replies to authenticated;
grant all on public.ticket_replies to service_role;
alter table public.ticket_replies enable row level security;
create policy "read replies" on public.ticket_replies for select to authenticated using (public.can_access_client(client_id));
create policy "write replies" on public.ticket_replies for insert to authenticated
  with check (public.can_access_client(client_id) and author_id = auth.uid()
    and exists (select 1 from public.tickets t where t.id = ticket_id and t.client_id = ticket_replies.client_id and t.status <> 'closed'));
create policy "staff delete replies" on public.ticket_replies for delete to authenticated using (public.is_staff_for(client_id));

-- Staff send a notification to every user of one client they serve
create or replace function public.send_client_notification(_client uuid, _title text, _body text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_staff_for(_client) then raise exception 'Not allowed'; end if;
  if char_length(coalesce(_title,'')) not between 1 and 200 then raise exception 'Title required (max 200)'; end if;
  insert into public.notifications(user_id,title,body,link)
    select user_id,_title,left(_body,2000),'/portal/notifications' from public.client_members where client_id=_client;
  get diagnostics n = row_count;
  insert into public.audit_logs(actor_id,action,entity,entity_id,details) values (auth.uid(),'notify','clients',_client,jsonb_build_object('title',_title));
  return n;
end $$;
revoke execute on function public.send_client_notification(uuid,text,text) from public, anon;
grant execute on function public.send_client_notification(uuid,text,text) to authenticated;

-- notify client when staff replies to ticket
create or replace function public.tg_reply_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.is_staff_for(new.client_id) then
    perform public.notify_client(new.client_id,'New reply on your support ticket',left(new.body,140),'/portal/support');
  end if; return new; end $$;
create trigger reply_notify after insert on public.ticket_replies for each row execute function public.tg_reply_notify();

-- audit log: actors can only insert, never forge another actor (already enforced); add index for history
create index audit_logs_created_idx on public.audit_logs(created_at desc);
