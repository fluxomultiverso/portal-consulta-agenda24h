# Instruções de Implantação — RPC registrar_comparecimento

## Pré-requisitos

- Acesso SSH ao servidor: `multiverso@192.168.0.4`
- Container Supabase: `supabase-db` (NÃO usar o container `postgres`)
- Banco: `postgres`

## Passo 1: Backup

Antes de aplicar qualquer alteração, faça backup do banco:

```bash
# No servidor, conectar ao container supabase-db
docker exec -it supabase-db pg_dump -U postgres -d postgres -F c -f /tmp/backup_antes_comparecimento.sql

# Copiar o backup para fora do container
docker cp supabase-db:/tmp/backup_antes_comparecimento.sql /mnt/storage/supabase/backup_antes_comparecimento.sql
```

## Passo 2: Verificar pré-requisitos no banco

Conecte ao banco e verifique:

```bash
docker exec -it supabase-db psql -U postgres -d postgres
```

Dentro do psql:

```sql
-- Verificar se a tabela agendamentos existe
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'agendamentos';

-- Verificar colunas necessárias
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'agendamentos'
ORDER BY ordinal_position;

-- Verificar se a função já existe
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'registrar_comparecimento';

-- Verificar se a tabela membros_empresa existe
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'membros_empresa';

-- Sair
\q
```

## Passo 3: Aplicar a migration

```bash
# Copiar o arquivo SQL para dentro do container
docker cp /caminho/para/supabase/migrations/20260917000000_rpc_registrar_comparecimento.sql supabase-db:/tmp/

# Executar a migration
docker exec -it supabase-db psql -U postgres -d postgres -f /tmp/20260917000000_rpc_registrar_comparecimento.sql
```

## Passo 4: Verificar aplicação

```bash
docker exec -it supabase-db psql -U postgres -d postgres
```

Dentro do psql:

```sql
-- Confirmar que a função existe
SELECT routine_name, security_type FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'registrar_comparecimento';

-- Verificar permissões
SELECT grantee, privilege_type FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'registrar_comparecimento';

-- Testar a função (substituir UUID de teste)
-- SELECT public.registrar_comparecimento('00000000-0000-0000-0000-000000000000', 'sim');

\q
```

## Passo 5: Configurar variáveis de ambiente no frontend

Criar arquivo `.env` na raiz do projeto frontend:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**IMPORTANTE:**
- Use APENAS a chave `anon`. Nunca use `service_role` no frontend.
- A URL e a chave anon estão no painel do Supabase em Settings > API.

## Rollback

Se precisar reverter:

```bash
docker exec -it supabase-db psql -U postgres -d postgres
```

```sql
DROP FUNCTION IF EXISTS public.registrar_comparecimento(UUID, TEXT);
```

## Notas

- A função usa `SECURITY DEFINER` com `search_path = public, pg_temp`.
- A função valida: autenticação, vínculo com empresa, permissão (admin ou profissional responsável).
- A função é idempotente: repetir a mesma resposta não altera a data original.
- A função rejeita troca de resultado já registrado.
- A função registra auditoria se a tabela `eventos_auditoria` existir.
- A função invalida lembretes pendentes se a tabela `lembretes` existir.
- RLS da tabela `agendamentos` NÃO deve conceder UPDATE ao papel `authenticated`.
