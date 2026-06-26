UPDATE public.tasks
SET due_date = (now() - interval '1 day')::date
WHERE title = 'Ligar para leads do mês';

UPDATE public.tasks
SET due_date = now()::date
WHERE title = 'Responder chamados atrasados';

UPDATE public.tasks
SET due_date = (now() + interval '2 days')::date
WHERE title = 'Implementar autenticação JWT';

UPDATE public.tasks
SET due_date = (now() + interval '5 days')::date
WHERE title = 'Campanha Google Ads';

UPDATE public.tasks
SET due_date = (now() - interval '5 days')::date
WHERE title = 'Migrar banco de dados';

UPDATE public.tasks
SET due_date = (now() + interval '3 days')::date
WHERE title = 'Renovar SSL';

UPDATE public.tasks
SET due_date = (now() + interval '1 day')::date
WHERE title = 'Reunião de alinhamento Comercial';

UPDATE public.tasks
SET due_date = (now() + interval '4 days')::date
WHERE title = 'Documentar API de WhatsApp';
