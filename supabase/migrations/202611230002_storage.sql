insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('screenshots','screenshots',false,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
-- No anon/authenticated storage object policies. Access is exclusively via an
-- authenticated application endpoint which performs an RLS attachment lookup.
