DO $$
DECLARE
  ws_id uuid;
  sec_comercial uuid := gen_random_uuid();
  sec_suporte uuid := gen_random_uuid();
  sec_dev uuid := gen_random_uuid();
  sec_mkt uuid := gen_random_uuid();
  proj_waspeed uuid := gen_random_uuid();
  proj_infra uuid := gen_random_uuid();
  col_id uuid := gen_random_uuid();
  col2_id uuid := gen_random_uuid();
  col3_id uuid := gen_random_uuid();
  user1 uuid := gen_random_uuid();
  user2 uuid := gen_random_uuid();
  user3 uuid := gen_random_uuid();
  user4 uuid := gen_random_uuid();
  collection_waspeed uuid := gen_random_uuid();
BEGIN
  -- Get an existing workspace or create one
  SELECT id INTO ws_id FROM public.workspaces LIMIT 1;
  IF ws_id IS NULL THEN
    ws_id := gen_random_uuid();
    INSERT INTO public.workspaces (id, name) VALUES (ws_id, 'WaSpeed Workspace');
  END IF;

  -- Create Sectors
  INSERT INTO public.sectors (id, name, workspace_id) VALUES 
  (sec_comercial, 'Comercial', ws_id),
  (sec_suporte, 'Suporte', ws_id),
  (sec_dev, 'Desenvolvimento', ws_id),
  (sec_mkt, 'Marketing', ws_id);

  -- Create Projects
  INSERT INTO public.projects (id, name, workspace_id, start_date, end_date, created_by) VALUES
  (proj_waspeed, 'WaSpeed V2', ws_id, now(), now() + interval '30 days', user1),
  (proj_infra, 'Infraestrutura WaSpeed', ws_id, now(), now() + interval '15 days', user1);

  -- Create Fake Auth Users (we don't need real passwords since we just want to see them in the UI)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES 
  (user1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alice.comercial@waspeed.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', now(), now(), now(), '', '', '', ''),
  (user2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob.suporte@waspeed.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', now(), now(), now(), '', '', '', ''),
  (user3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carol.dev@waspeed.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', now(), now(), now(), '', '', '', ''),
  (user4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dave.mkt@waspeed.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', now(), now(), now(), '', '', '', '');

  -- Profiles might be created via trigger on auth.users. 
  -- We just update them. If they aren't created by trigger, we should insert them, but let's assume the trigger exists.
  -- Actually, let's just do an insert ON CONFLICT (id) if id is the PK, but if user_id is unique we must handle that.
  -- Let's just delete the profiles with those user_ids to avoid constraint issues, then insert them.
  DELETE FROM public.profiles WHERE user_id IN (user1, user2, user3, user4);
  INSERT INTO public.profiles (id, user_id, name, email, workspace_id, sector_id)
  VALUES
  (user1, user1, 'Alice Comercial', 'alice.comercial@waspeed.com', ws_id, sec_comercial),
  (user2, user2, 'Bob Suporte', 'bob.suporte@waspeed.com', ws_id, sec_suporte),
  (user3, user3, 'Carol Dev', 'carol.dev@waspeed.com', ws_id, sec_dev),
  (user4, user4, 'Dave MKT', 'dave.mkt@waspeed.com', ws_id, sec_mkt);
  
  -- Create a Collection
  INSERT INTO public.collections (id, name, workspace_id) VALUES (collection_waspeed, 'WaSpeed Backlog', ws_id);

  -- Create Columns
  INSERT INTO public.columns (id, name, collection_id, position, color) VALUES
  (col_id, 'To Do', collection_waspeed, 0, '#ef4444'),
  (col2_id, 'In Progress', collection_waspeed, 1, '#eab308'),
  (col3_id, 'Done', collection_waspeed, 2, '#22c55e');

  -- Create Tasks
  INSERT INTO public.tasks (id, title, description, column_id, assignee_id, project_id, collection_id, created_by, due_date) VALUES
  (gen_random_uuid(), 'Ligar para leads do mês', 'Entrar em contato com 50 leads captados', col_id, user1, proj_waspeed, collection_waspeed, user1, (now() - interval '1 day')::date),
  (gen_random_uuid(), 'Responder chamados atrasados', 'Zerar fila de atendimento N1', col_id, user2, proj_waspeed, collection_waspeed, user1, now()::date),
  (gen_random_uuid(), 'Implementar autenticação JWT', 'Refatorar login', col2_id, user3, proj_waspeed, collection_waspeed, user1, (now() + interval '2 days')::date),
  (gen_random_uuid(), 'Campanha Google Ads', 'Criar anúncios para Black Friday', col2_id, user4, proj_waspeed, collection_waspeed, user1, (now() + interval '5 days')::date),
  (gen_random_uuid(), 'Migrar banco de dados', 'Fazer dump e restaurar', col3_id, user3, proj_infra, collection_waspeed, user1, (now() - interval '5 days')::date),
  (gen_random_uuid(), 'Renovar SSL', 'Certificado expira em 3 dias', col_id, user3, proj_infra, collection_waspeed, user1, (now() + interval '3 days')::date),
  (gen_random_uuid(), 'Reunião de alinhamento Comercial', 'Discutir metas', col3_id, user1, proj_waspeed, collection_waspeed, user1, (now() + interval '1 day')::date),
  (gen_random_uuid(), 'Documentar API de WhatsApp', 'Gerar swagger docs', col2_id, user3, proj_waspeed, collection_waspeed, user1, (now() + interval '4 days')::date);

END $$;
