
create policy "read client files" on storage.objects for select to authenticated
  using (bucket_id='client-files' and public.can_access_client(((storage.foldername(name))[1])::uuid));
create policy "upload client files" on storage.objects for insert to authenticated
  with check (bucket_id='client-files' and public.can_access_client(((storage.foldername(name))[1])::uuid));
create policy "staff delete client files" on storage.objects for delete to authenticated
  using (bucket_id='client-files' and public.is_staff_for(((storage.foldername(name))[1])::uuid));
