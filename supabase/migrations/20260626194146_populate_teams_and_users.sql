DO $$
DECLARE
  ws_id uuid;
  t_rh uuid := gen_random_uuid();
  t_fin uuid := gen_random_uuid();
  t_op uuid := gen_random_uuid();
  t_dir uuid := gen_random_uuid();
  t_sac uuid := gen_random_uuid();
  t_jur uuid := gen_random_uuid();
  t_log uuid := gen_random_uuid();
  t_ti uuid := gen_random_uuid();
  t_com uuid := gen_random_uuid();
  t_sup uuid := gen_random_uuid();
  t_dev uuid := gen_random_uuid();
  t_mkt uuid := gen_random_uuid();

  u_rh1 uuid := gen_random_uuid();
  u_fin1 uuid := gen_random_uuid();
  u_op1 uuid := gen_random_uuid();
  u_dir1 uuid := gen_random_uuid();
  u_sac1 uuid := gen_random_uuid();
  u_sac2 uuid := gen_random_uuid();
  u_jur1 uuid := gen_random_uuid();
  u_log1 uuid := gen_random_uuid();
  u_ti1 uuid := gen_random_uuid();
  u_ti2 uuid := gen_random_uuid();

  -- Password hash for 'password' -> standard used in previous seed
  pwd_hash text := '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa';
BEGIN
  -- Get existing workspace
  SELECT id INTO ws_id FROM public.workspaces LIMIT 1;
  
  IF ws_id IS NOT NULL THEN
    -- 1. Create Teams
    INSERT INTO public.teams (id, name, workspace_id) VALUES
    (t_rh, 'Recursos Humanos', ws_id),
    (t_fin, 'Financeiro', ws_id),
    (t_op, 'Operações', ws_id),
    (t_dir, 'Diretoria', ws_id),
    (t_sac, 'Atendimento ao Cliente', ws_id),
    (t_jur, 'Jurídico', ws_id),
    (t_log, 'Logística', ws_id),
    (t_ti, 'Tecnologia da Informação', ws_id),
    (t_com, 'Comercial', ws_id),
    (t_sup, 'Suporte', ws_id),
    (t_dev, 'Desenvolvimento', ws_id),
    (t_mkt, 'Marketing', ws_id);

    -- 2. Create Users in Auth
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES 
    (u_rh1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rh1@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_fin1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fin1@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_op1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'op1@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_dir1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dir1@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_sac1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sac1@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_sac2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sac2@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_jur1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jur1@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_log1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'log1@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_ti1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ti1@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', ''),
    (u_ti2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ti2@waspeed.com', pwd_hash, now(), now(), now(), '', '', '', '');

    -- Delete profiles if they got auto-created, then insert to ensure names match
    DELETE FROM public.profiles WHERE user_id IN (u_rh1, u_fin1, u_op1, u_dir1, u_sac1, u_sac2, u_jur1, u_log1, u_ti1, u_ti2);
    
    -- 3. Create Profiles
    INSERT INTO public.profiles (id, user_id, name, email, workspace_id)
    VALUES
    (u_rh1, u_rh1, 'Mariana RH', 'rh1@waspeed.com', ws_id),
    (u_fin1, u_fin1, 'Pedro Financeiro', 'fin1@waspeed.com', ws_id),
    (u_op1, u_op1, 'Lucas Operações', 'op1@waspeed.com', ws_id),
    (u_dir1, u_dir1, 'Ana Diretora', 'dir1@waspeed.com', ws_id),
    (u_sac1, u_sac1, 'João SAC', 'sac1@waspeed.com', ws_id),
    (u_sac2, u_sac2, 'Julia SAC', 'sac2@waspeed.com', ws_id),
    (u_jur1, u_jur1, 'Dra. Camila', 'jur1@waspeed.com', ws_id),
    (u_log1, u_log1, 'Carlos Logística', 'log1@waspeed.com', ws_id),
    (u_ti1, u_ti1, 'Fernando TI', 'ti1@waspeed.com', ws_id),
    (u_ti2, u_ti2, 'Beatriz Infra', 'ti2@waspeed.com', ws_id);

    -- 4. Add Members to Teams
    INSERT INTO public.team_members (team_id, user_id) VALUES
    (t_rh, u_rh1),
    (t_fin, u_fin1),
    (t_op, u_op1),
    (t_dir, u_dir1),
    (t_sac, u_sac1),
    (t_sac, u_sac2),
    (t_jur, u_jur1),
    (t_log, u_log1),
    (t_ti, u_ti1),
    (t_ti, u_ti2);

    -- Now, try to add the old users to their respective teams as well
    -- user1: alice.comercial@waspeed.com -> t_com
    -- user2: bob.suporte@waspeed.com -> t_sup
    -- user3: carol.dev@waspeed.com -> t_dev
    -- user4: dave.mkt@waspeed.com -> t_mkt
    INSERT INTO public.team_members (team_id, user_id)
    SELECT t_com, id FROM public.profiles WHERE email = 'alice.comercial@waspeed.com';

    INSERT INTO public.team_members (team_id, user_id)
    SELECT t_sup, id FROM public.profiles WHERE email = 'bob.suporte@waspeed.com';

    INSERT INTO public.team_members (team_id, user_id)
    SELECT t_dev, id FROM public.profiles WHERE email = 'carol.dev@waspeed.com';

    INSERT INTO public.team_members (team_id, user_id)
    SELECT t_mkt, id FROM public.profiles WHERE email = 'dave.mkt@waspeed.com';

  END IF;
END $$;
