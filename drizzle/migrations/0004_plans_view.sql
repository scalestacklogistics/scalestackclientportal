create view public.plans_with_service with (security_invoker=on) as
  select p.id, s.name || ' — ' || p.name || ' (' || p.price || ')' as label from public.plans p join public.services s on s.id = p.service_id;
grant select on public.plans_with_service to authenticated;