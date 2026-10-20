
create type public.app_role as enum ('admin','team','client');
create type public.service_category as enum ('website','ecommerce','marketing','ads','seo','ai','design');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text, phone text, avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique(user_id, role)
);
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null, contact_name text, contact_email text, phone text, website text,
  status text not null default 'active', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null, created_at timestamptz not null default now(), unique(client_id,user_id)
);
create table public.team_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null, created_at timestamptz not null default now(), unique(client_id,user_id)
);
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null, role app_role not null default 'client',
  client_id uuid references public.clients(id) on delete cascade,
  accepted_at timestamptz, created_by uuid, created_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null, category service_category not null, description text, features text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null, price numeric(10,2) not null default 0, billing_interval text not null default 'monthly',
  description text, created_at timestamptz not null default now()
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active', start_date date not null default current_date, renewal_date date,
  created_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null, description text, status text not null default 'planning',
  progress int not null default 0, start_date date, due_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null, due_date date, completed boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null, summary text, period text, file_path text, published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null, storage_path text not null, size bigint, mime_type text,
  category text not null default 'document', is_deliverable boolean not null default false,
  uploaded_by uuid, created_at timestamptz not null default now()
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  number text not null, description text, amount numeric(10,2) not null default 0,
  status text not null default 'pending', issue_date date not null default current_date, due_date date,
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(10,2) not null, method text, paid_at date not null default current_date, reference text,
  created_at timestamptz not null default now()
);
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  subject text not null, description text, priority text not null default 'normal',
  status text not null default 'open', created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_id uuid not null, body text not null, created_at timestamptz not null default now()
);
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null, scheduled_at timestamptz not null, duration_minutes int not null default 30,
  meeting_url text, notes text, created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, title text not null, body text, link text, read boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, action text not null, entity text, entity_id uuid, details jsonb,
  created_at timestamptz not null default now()
);

-- grants
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- helper functions
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.is_staff_for(_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'admin')
    or exists(select 1 from public.team_assignments where client_id=_client and user_id=auth.uid()) $$;

create or replace function public.can_access_client(_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff_for(_client)
    or exists(select 1 from public.client_members where client_id=_client and user_id=auth.uid()) $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.clients enable row level security;
alter table public.client_members enable row level security;
alter table public.team_assignments enable row level security;
alter table public.invitations enable row level security;
alter table public.services enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.reports enable row level security;
alter table public.files enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.tickets enable row level security;
alter table public.messages enable row level security;
alter table public.meetings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "own profile or staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'team'));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "admin manage profiles" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "read accessible clients" on public.clients for select to authenticated using (public.can_access_client(id));
create policy "admin manage clients" on public.clients for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "read memberships" on public.client_members for select to authenticated
  using (user_id = auth.uid() or public.is_staff_for(client_id));
create policy "admin manage memberships" on public.client_members for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "read assignments" on public.team_assignments for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage assignments" on public.team_assignments for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "admin manage invitations" on public.invitations for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "read services" on public.services for select to authenticated using (true);
create policy "admin services" on public.services for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read plans" on public.plans for select to authenticated using (true);
create policy "admin plans" on public.plans for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- client-scoped tables: read if access, write if staff
do $$ declare t text; begin
  foreach t in array array['subscriptions','projects','milestones','files','invoices','payments','tickets','meetings'] loop
    execute format('create policy "read %1$s" on public.%1$I for select to authenticated using (public.can_access_client(client_id))', t);
    execute format('create policy "staff write %1$s" on public.%1$I for all to authenticated using (public.is_staff_for(client_id)) with check (public.is_staff_for(client_id))', t);
  end loop; end $$;

create policy "read reports" on public.reports for select to authenticated
  using (public.is_staff_for(client_id) or (published and public.can_access_client(client_id)));
create policy "staff write reports" on public.reports for all to authenticated
  using (public.is_staff_for(client_id)) with check (public.is_staff_for(client_id));

create policy "clients open tickets" on public.tickets for insert to authenticated
  with check (public.can_access_client(client_id) and created_by = auth.uid());

create policy "read messages" on public.messages for select to authenticated using (public.can_access_client(client_id));
create policy "send messages" on public.messages for insert to authenticated
  with check (public.can_access_client(client_id) and sender_id = auth.uid());
create policy "staff delete messages" on public.messages for delete to authenticated using (public.is_staff_for(client_id));

create policy "clients upload files" on public.files for insert to authenticated
  with check (public.can_access_client(client_id) and uploaded_by = auth.uid() and is_deliverable = false);

create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy "staff create notifications" on public.notifications for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'team') or user_id = auth.uid());

create policy "admin read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "write own audit" on public.audit_logs for insert to authenticated with check (actor_id = auth.uid());

-- signup handling: first user = admin; invited users get role + membership
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv record;
begin
  insert into public.profiles(id,email,full_name) values (new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''));
  if not exists(select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id,role) values (new.id,'admin');
    return new;
  end if;
  select * into inv from public.invitations where lower(email)=lower(new.email) and accepted_at is null order by created_at desc limit 1;
  if found then
    insert into public.user_roles(user_id,role) values (new.id,inv.role) on conflict do nothing;
    if inv.client_id is not null then
      if inv.role = 'client' then
        insert into public.client_members(client_id,user_id) values (inv.client_id,new.id) on conflict do nothing;
      else
        insert into public.team_assignments(client_id,user_id) values (inv.client_id,new.id) on conflict do nothing;
      end if;
    end if;
    update public.invitations set accepted_at = now() where id = inv.id;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- notify client members on new invoice / published report
create or replace function public.notify_client(_client uuid, _title text, _body text, _link text) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications(user_id,title,body,link)
  select user_id,_title,_body,_link from public.client_members where client_id=_client $$;
revoke execute on function public.notify_client(uuid,text,text,text) from public, anon, authenticated;

create or replace function public.tg_invoice_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.notify_client(new.client_id,'New invoice '||new.number,'Amount: '||new.amount,'/portal/billing'); return new; end $$;
create trigger invoice_notify after insert on public.invoices for each row execute function public.tg_invoice_notify();

create or replace function public.tg_report_notify() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.published and (tg_op='INSERT' or not old.published) then
    perform public.notify_client(new.client_id,'New report: '||new.title,new.period,'/portal/reports');
  end if; return new; end $$;
create trigger report_notify after insert or update on public.reports for each row execute function public.tg_report_notify();

-- seed services
insert into public.services(name,category,description,features) values
('Website Development','website','Custom, high-performance websites',array['Design mockups','Responsive build','CMS setup','Hosting & maintenance']),
('Shopify & E-commerce','ecommerce','Online stores that convert',array['Store setup','Theme customization','Product catalog','Checkout optimization']),
('Digital Marketing','marketing','Full-funnel growth campaigns',array['Strategy','Email marketing','Social content','Monthly reporting']),
('Paid Ads (Google, Meta, TikTok)','ads','Performance advertising',array['Campaign setup','Creative testing','Budget optimization','ROAS reporting']),
('SEO, GEO & AEO','seo','Search & AI answer visibility',array['Technical audit','Keyword tracking','Content optimization','AI engine visibility']),
('AI Chatbots & Automation','ai','Automate support and workflows',array['Chatbot build','Workflow automation','CRM integration','Usage analytics']),
('Graphic Design','design','Brand and marketing design',array['Brand identity','Social graphics','Print collateral','Revision rounds']);
insert into public.plans(service_id,name,price,description)
select id,'Starter',499,'Essentials' from public.services
union all select id,'Growth',1299,'Most popular' from public.services
union all select id,'Scale',2999,'Full service' from public.services;
