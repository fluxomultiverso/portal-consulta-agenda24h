# Implantação do registro de comparecimento

Use somente a migration `202609180017_comparecimento_workflow.sql` para o registro de atendimento concluído ou falta.

A migration antiga `20260917000000_rpc_registrar_comparecimento.sql` foi retirada porque não corresponde à arquitetura atual: a escrita deve ocorrer exclusivamente pelo workflow autenticado do n8n, nunca diretamente pelo navegador.

Antes da aplicação, execute o preflight e siga o roteiro mantido em `../workflows-n8n/comparecimento/README.md` no projeto principal Agenda 24h.
