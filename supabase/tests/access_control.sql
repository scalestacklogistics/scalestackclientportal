-- Access-control test: admin, assigned team member, Client A, Client B.
-- Runs in a transaction and rolls back. Any failed check raises an exception.
begin;
set local client_min_messages = notice;

-- fixtures (as superuser)
insert into auth.users (id, email, instance_id, aud, role) values
 ('00000000-0000-0000-0000-0000000000a1','t-admin@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b1','t-team@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000c1','t-clienta@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000c2','t-clientb@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.user_roles(user_id, role) values
 ('00000000-0000-0000-0000-0000000000a1','admin'),('00000000-0000-0000-0000-0000000000b1','team'),
 ('00000000-0000-0000-0000-0000000000c1','client'),('00000000-0000-0000-0000-0000000000c2','client')
 on conflict do nothing;
insert into public.clients(id, company_name) values
 ('11111111-0000-0000-0000-00000000000a','Client A Ltd'),('11111111-0000-0000-0000-00000000000b','Client B Ltd');
insert into public.client_members(client_id,user_id) values
 ('11111111-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c1'),
 ('11111111-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c2');
insert into public.team_assignments(client_id,user_id) values ('11111111-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000b1');
insert into public.projects(id,client_id,name) values
 ('22222222-0000-0000-0000-00000000000a','11111111-0000-0000-0000-00000000000a','A project'),
 ('22222222-0000-0000-0000-00000000000b','11111111-0000-0000-0000-00000000000b','B project');
insert into public.invoices(client_id,number,amount) values
 ('11111111-0000-0000-0000-00000000000a','A-1',100),('11111111-0000-0000-0000-00000000000b','B-1',200);
insert into public.reports(client_id,title,published) values
 ('11111111-0000-0000-0000-00000000000b','B draft report',false),('11111111-0000-0000-0000-00000000000b','B live report',true);
insert into public.files(client_id,name,storage_path) values
 ('11111111-0000-0000-0000-00000000000b','b.pdf','11111111-0000-0000-0000-00000000000b/files/b.pdf');
insert into public.messages(client_id,sender_id,body) values ('11111111-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c2','secret B');
insert into storage.objects(bucket_id,name) values
 ('client-files','11111111-0000-0000-0000-00000000000a/files/a.pdf'),
 ('client-files','11111111-0000-0000-0000-00000000000b/files/b.pdf'),
 ('client-files','11111111-0000-0000-0000-00000000000b/reports/draft.pdf');

create or replace function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok then raise notice 'PASS %', label; else raise exception 'FAIL %', label; end if; end $$;
create or replace function pg_temp.act(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub',uid,'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ===== Client A =====
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
select pg_temp.check('A sees only own client', (select array_agg(company_name) = array['Client A Ltd'] from public.clients));
select pg_temp.check('A cannot read B projects', not exists(select 1 from public.projects where client_id='11111111-0000-0000-0000-00000000000b'));
select pg_temp.check('A cannot read B invoices', not exists(select 1 from public.invoices where number='B-1'));
select pg_temp.check('A cannot read B reports', not exists(select 1 from public.reports where client_id='11111111-0000-0000-0000-00000000000b'));
select pg_temp.check('A cannot read B files rows', not exists(select 1 from public.files where client_id='11111111-0000-0000-0000-00000000000b'));
select pg_temp.check('A cannot read B messages', not exists(select 1 from public.messages where body='secret B'));
select pg_temp.check('A cannot discover B storage objects', (select count(*) from storage.objects where bucket_id='client-files') = 1);
select pg_temp.check('A cannot discover B members', not exists(select 1 from public.client_members where client_id='11111111-0000-0000-0000-00000000000b'));
select pg_temp.check('A cannot see B user profile', not exists(select 1 from public.profiles where id='00000000-0000-0000-0000-0000000000c2'));
with u as (update public.invoices set amount=0 where number='B-1' returning 1) select pg_temp.check('A cannot edit B invoice', (select count(*) from u)=0);
with u as (update public.invoices set status='paid' where number='A-1' returning 1) select pg_temp.check('A cannot mark own invoice paid', (select count(*) from u)=0);
with u as (delete from public.projects returning 1) select pg_temp.check('A cannot delete projects', (select count(*) from u)=0);
do $$ begin
  begin insert into public.tickets(client_id,subject,created_by) values ('11111111-0000-0000-0000-00000000000b','x','00000000-0000-0000-0000-0000000000c1');
    raise exception 'FAIL A opened ticket for B'; exception when insufficient_privilege then raise notice 'PASS A cannot open ticket for B'; end;
  begin insert into public.messages(client_id,sender_id,body) values ('11111111-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000b1','spoof');
    raise exception 'FAIL A spoofed sender'; exception when insufficient_privilege then raise notice 'PASS A cannot spoof message sender'; end;
  begin insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000c1','admin');
    raise exception 'FAIL A self-granted admin'; exception when insufficient_privilege then raise notice 'PASS A cannot grant self admin'; end;
  begin insert into public.client_members(client_id,user_id) values ('11111111-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c1');
    raise exception 'FAIL A joined B'; exception when insufficient_privilege then raise notice 'PASS A cannot join Client B'; end;
  begin insert into storage.objects(bucket_id,name) values ('client-files','11111111-0000-0000-0000-00000000000b/files/evil.pdf');
    raise exception 'FAIL A uploaded into B'; exception when insufficient_privilege then raise notice 'PASS A cannot upload into B folder'; end;
  begin insert into public.files(client_id,name,storage_path,uploaded_by,is_deliverable) values ('11111111-0000-0000-0000-00000000000a','x','11111111-0000-0000-0000-00000000000b/files/b.pdf','00000000-0000-0000-0000-0000000000c1',false);
    raise exception 'FAIL A pointed file at B path'; exception when raise_exception then raise notice 'PASS A cannot reference B storage path'; end;
end $$;
select pg_temp.check('A can open own ticket', (with i as (insert into public.tickets(client_id,subject,created_by) values ('11111111-0000-0000-0000-00000000000a','help','00000000-0000-0000-0000-0000000000c1') returning 1) select count(*)=1 from i));
reset role;

-- ===== Client B =====
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check('B sees only published reports', (select array_agg(title) = array['B live report'] from public.reports));
select pg_temp.check('B cannot download unpublished report file', not exists(select 1 from storage.objects where name like '%/reports/draft.pdf'));
select pg_temp.check('B cannot read A projects', not exists(select 1 from public.projects where client_id='11111111-0000-0000-0000-00000000000a'));
reset role;

-- ===== Team member (assigned to A only) =====
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
select pg_temp.check('Team sees only assigned client', (select array_agg(company_name) = array['Client A Ltd'] from public.clients));
select pg_temp.check('Team cannot read unassigned B invoices', not exists(select 1 from public.invoices where number='B-1'));
select pg_temp.check('Team cannot list B storage', not exists(select 1 from storage.objects where name like '11111111-0000-0000-0000-00000000000b/%'));
select pg_temp.check('Team can update assigned project', (with u as (update public.projects set progress=50 where client_id='11111111-0000-0000-0000-00000000000a' returning 1) select count(*)=1 from u));
with u as (update public.projects set progress=50 where client_id='11111111-0000-0000-0000-00000000000b' returning 1) select pg_temp.check('Team cannot update unassigned project', (select count(*) from u)=0);
do $$ begin
  begin insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000b1','admin');
    raise exception 'FAIL team self-granted admin'; exception when insufficient_privilege then raise notice 'PASS team cannot grant self admin'; end;
  begin insert into public.team_assignments(client_id,user_id) values ('11111111-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b1');
    raise exception 'FAIL team self-assigned'; exception when insufficient_privilege then raise notice 'PASS team cannot self-assign to B'; end;
  begin insert into public.invoices(client_id,number,amount) values ('11111111-0000-0000-0000-00000000000b','X',1);
    raise exception 'FAIL team wrote B invoice'; exception when insufficient_privilege then raise notice 'PASS team cannot create B invoice'; end;
  begin insert into public.notifications(user_id,title) values ('00000000-0000-0000-0000-0000000000c2','phish');
    raise exception 'FAIL team notified B'; exception when insufficient_privilege then raise notice 'PASS team cannot notify unassigned client users'; end;
  begin insert into public.clients(company_name) values ('New');
    raise exception 'FAIL team created client'; exception when insufficient_privilege then raise notice 'PASS team cannot create clients'; end;
end $$;
reset role;

-- ===== Admin =====
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check('Admin sees all test clients', (select count(*) from public.clients where company_name like 'Client _ Ltd')=2);
select pg_temp.check('Admin sees draft report', exists(select 1 from public.reports where title='B draft report'));
select pg_temp.check('Admin can read all storage', (select count(*) from storage.objects where name like '11111111-%')=3);
select pg_temp.check('Admin can assign roles', (with i as (insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-0000000000b1','admin') returning 1) select count(*)=1 from i));
reset role;

-- ===== Anonymous =====
set local role anon;
do $$ begin
  begin perform 1 from public.clients; raise exception 'FAIL anon read clients';
  exception when insufficient_privilege then raise notice 'PASS anon cannot read clients'; end;
end $$;
reset role;

rollback;
