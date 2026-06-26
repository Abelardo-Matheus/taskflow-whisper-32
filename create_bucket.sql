insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true) on conflict do nothing;
