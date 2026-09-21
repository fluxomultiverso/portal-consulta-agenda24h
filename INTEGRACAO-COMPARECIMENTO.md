# Integração do comparecimento — 19/09/2026

O portal está preparado para POST ao webhook de produção:
`https://n8n.multiverso360.com.br/webhook/agenda24h/comparecimento/v1`.

O envio começa desabilitado: `VITE_COMPARECIMENTO_HABILITADO` deve ser exatamente `true` para habilitar. A ausência da variável também desabilita. A URL pode ser definida por `VITE_COMPARECIMENTO_WEBHOOK_URL`; só aceita HTTPS. Não há chave interna/service_role nessa configuração. Variáveis VITE são públicas e incorporadas ao build.

Botões mantêm confirmação Sim/Não, respeitam início previsto e mostram indisponibilidade enquanto desabilitados. O serviço também bloqueia o envio, mesmo se chamado fora dos botões. Não há fallback de sucesso simulado nem chamada à RPC antiga. Status e timestamps da UI vêm exclusivamente da resposta de sucesso validada do servidor.

Para enviar, o serviço exige sessão real do cliente Supabase existente. A troca de perfil simulada da UI não fornece identidade ao webhook. A autenticação e o carregamento de dados reais do portal continuam pendentes; esta alteração não converte o login simulado em login real. IDs fictícios fora do formato UUID são rejeitados. A autorização real é do workflow e da função no banco.

Após a confirmação, a tentativa recebe UUID; cliques durante envio são bloqueados. O corpo (sem token) fica em sessionStorage, separado por usuário e agendamento, até um sucesso validado. Em timeout, erro ou recarga da mesma aba, repetir a mesma resposta reutiliza a chave; uma resposta oposta fica bloqueada enquanto a tentativa estiver pendente. Fechar a aba encerra esse armazenamento; a idempotência por agendamento no banco continua necessária entre abas/dispositivos. Se sessionStorage não funcionar, nenhum POST é enviado. O token só é obtido da sessão no momento da chamada, sem cópia para a tentativa.

O erro 401 no teste da credencial Supabase permanece sem diagnóstico concluído. Antes de habilitar: confirmar ANON_KEY do nó Auth, aplicar/verificar migration mediante autorização, configurar credencial interna do banco, validar login e dados reais, HTTPS/CORS e concorrência. Depois alterar a flag no ambiente de build e reconstruir o portal. Não basta editar .env.example.

Nenhuma migration, ativação n8n ou publicação do portal faz parte desta mudança local. A migration antiga do portal não foi aplicada nem modificada. A documentação principal e o plano de testes estão no projeto Agenda 24h estrutura, em workflows-n8n/comparecimento.
