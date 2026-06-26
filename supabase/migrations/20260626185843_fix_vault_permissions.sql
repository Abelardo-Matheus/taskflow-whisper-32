-- Libera o uso do schema do Vault para todos os papéis principais
GRANT USAGE ON SCHEMA vault TO postgres, authenticated, service_role, anon;

-- Dá permissão TOTAL (leitura, escrita, deleção) em todas as tabelas do Vault
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA vault TO postgres, authenticated, service_role, anon;

-- Dá permissão TOTAL nas sequências (IDs automáticos) do Vault
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA vault TO postgres, authenticated, service_role, anon;
