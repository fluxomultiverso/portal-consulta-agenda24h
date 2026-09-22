# Gestão de equipe e serviços

Workflow inativo para `POST /webhook/agenda24h/gestao/v1`. Ele valida o token do administrador, cria os acessos necessários no Supabase Auth e envia toda a alteração para `aplicar_gestao_workflow` em uma transação.

Antes de ativar: aplique a migration `202609220019_gestao_empresa_workflow.sql`, defina uma senha forte para o papel `agenda24h_gestao`, associe essa credencial ao nó PostgreSQL, associe a credencial Supabase API com service role ao nó de convite e a credencial Header Auth pública ao nó de validação.

O navegador não recebe credenciais de escrita e não possui permissão para executar a função de alteração.
