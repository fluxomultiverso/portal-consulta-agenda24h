# Portal Agenda 24h

Aplicação web de consulta e gerenciamento do Agenda 24h. Esta pasta foi incorporada ao projeto oficial a partir da base criada no VS Code em `C:\projetos\portal consulta agenda24h`.

## Estado atual

A interface já oferece:

- login real com Supabase Auth, recuperação de senha e definição de senha no primeiro acesso;
- navegação mobile-first para administrador, profissional e recepcionista;
- visão geral com indicadores e gráfico;
- consulta diária da agenda e detalhe do atendimento;
- registro de atendimento concluído ou falta, condicionado à configuração do Supabase e do webhook;
- relatórios semanais e acompanhamento de automações;
- gestão administrativa em três etapas para incluir, editar ou excluir profissionais, recepcionistas e serviços;
- estados de carregamento, vazio, erro e acesso negado.

A aplicação não possui mais fallback para dados simulados. Login, empresa, papel, agenda, profissionais, indicadores, relatórios, automações e gestão dependem do Supabase real. Quando a conexão ou um contrato de leitura não estiver disponível, a interface mostra um estado de configuração ou erro sem inventar dados.

As alterações da gestão nunca são gravadas diretamente pelo navegador. O portal envia um contrato autenticado ao n8n, que valida o administrador e executa a função transacional exclusiva do banco.

## Execução local

Requisitos: Node.js compatível com Vite 8 e npm.

```bash
npm install
npm run dev
```

Validações:

```bash
npm run lint
npm run build
```

## Configuração

Copie `.env.example` para `.env.local` e preencha somente valores públicos destinados ao frontend:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
VITE_COMPARECIMENTO_HABILITADO=false
VITE_COMPARECIMENTO_WEBHOOK_URL=https://n8n.multiverso360.com.br/webhook/agenda24h/comparecimento/v1
VITE_GESTAO_HABILITADA=false
VITE_GESTAO_WEBHOOK_URL=https://n8n.multiverso360.com.br/webhook/agenda24h/gestao/v1
```

Não armazene `service_role`, senhas ou outros segredos no frontend.

### URLs de autenticação

Os e-mails de convite, primeiro acesso e recuperação são enviados pelo serviço SMTP configurado no Supabase Auth. O portal não usa EmailJS para autenticação. O n8n pode criar ou convidar o usuário pela operação administrativa do Supabase, mas nunca recebe nem define a senha escolhida pelo usuário.

No Supabase Auth, inclua nas URLs de redirecionamento permitidas:

- `https://consulta.multiverso360.com.br/definir-senha`
- `https://consulta.multiverso360.com.br/redefinir-senha`
- `https://portalagenda24h.multiverso360.com.br/definir-senha`
- `https://portalagenda24h.multiverso360.com.br/redefinir-senha`
- os equivalentes do endereço local usado no desenvolvimento.

O provisionamento de um novo usuário deve enviar o convite com redirecionamento para `/definir-senha`. A solicitação feita em `/recuperar-senha` direciona automaticamente para `/redefinir-senha`. Os links são validados pelo Supabase antes que o formulário aceite a nova senha.

## Contratos de banco instalados

As migrations 013, 014 e `202609210018_contratos_leitura_portal.sql` foram validadas em transação e instaladas no Supabase self-hosted em 21/09/2026. A migration 018 deriva empresa, papel e profissional de `auth.uid()` e não aceita a empresa escolhida pelo navegador. A migration `202609220019_gestao_empresa_workflow.sql` prepara o papel de recepcionista e a execução exclusiva do workflow de gestão; deve ser aplicada antes de habilitar a tela publicada.

As tabelas de negócio são somente leitura para o frontend. Ações como comparecimento e solicitações de gestão são enviadas com o token da sessão para webhooks HTTPS do n8n. O workflow valida autorização e dados antes de executar qualquer alteração. Login e senha usam diretamente o Supabase Auth; senhas nunca passam pelo n8n.

As decisões funcionais estão em [`../documentacao/portal-decisoes-consolidadas.md`](../documentacao/portal-decisoes-consolidadas.md).
