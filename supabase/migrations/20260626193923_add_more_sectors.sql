DO $$
DECLARE
  ws_id uuid;
BEGIN
  -- Get an existing workspace
  SELECT id INTO ws_id FROM public.workspaces LIMIT 1;
  
  IF ws_id IS NOT NULL THEN
    INSERT INTO public.sectors (id, name, workspace_id) VALUES
    (gen_random_uuid(), 'Recursos Humanos', ws_id),
    (gen_random_uuid(), 'Financeiro', ws_id),
    (gen_random_uuid(), 'Operações', ws_id),
    (gen_random_uuid(), 'Diretoria', ws_id),
    (gen_random_uuid(), 'Atendimento ao Cliente', ws_id),
    (gen_random_uuid(), 'Jurídico', ws_id),
    (gen_random_uuid(), 'Logística', ws_id),
    (gen_random_uuid(), 'Tecnologia da Informação', ws_id);
  END IF;
END $$;
