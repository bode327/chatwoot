# Análise de Segurança, Licenciamento e Telemetria

Este documento detalha aspectos do código do Chatwoot que não são imediatamente visíveis na interface, focando em como o software se comunica com o mundo exterior, como valida licenças e quais dados são coletados.

## 1. Telemetria e Comunicação com "Chatwoot Hub"

O sistema possui um mecanismo centralizado de comunicação com os servidores da Chatwoot Inc., gerenciado pela classe `ChatwootHub` (`lib/chatwoot_hub.rb`).

### O que é enviado?
A instância envia periodicamente um payload JSON para `https://hub.2.chatwoot.com` contendo:
*   **Identificação:** `installation_identifier` (UUID único gerado na instalação).
*   **Ambiente:** Versão do software (`Chatwoot.config[:version]`), host (`FRONTEND_URL`), sistema operacional e ambiente (`ENV['CW_EDITION']`).
*   **Métricas de Uso:** Contagem total de:
    *   Contas (`Account.count`)
    *   Usuários (`User.count`)
    *   Caixas de Entrada (`Inbox.count`)
    *   Conversas (`Conversation.count`)
    *   Mensagens Recebidas/Enviadas.
*   **Dados do Proprietário:** No momento da instalação/onboarding, são enviados o nome da empresa, nome do administrador e e-mail.

### Quando é enviado?
*   **Diariamente:** Através do job `Internal::CheckNewVersionsJob`, agendado para rodar às 12:00 (configurado em `config/schedule.yml`).
*   **Eventos:** Durante o registro inicial (`register_instance`) e verificação de atualizações.

### Como desabilitar?
A telemetria pode ser desabilitada definindo a variável de ambiente:
```bash
DISABLE_TELEMETRY=true
```
No entanto, isso pode afetar a notificação de novas versões no painel Super Admin.

### Push Notifications Relay
Para notificações em aplicativos móveis oficiais (iOS/Android), o Chatwoot utiliza um serviço de relay. O método `ChatwootHub.send_push` envia o payload da notificação para `https://hub.2.chatwoot.com/send_push`. Isso ocorre porque as chaves privadas do Firebase/APNS dos apps oficiais pertencem à Chatwoot Inc. e não podem ser distribuídas no código open-source.

## 2. Licenciamento e Modos de Operação

O Chatwoot opera em diferentes modos baseados na presença de arquivos e configurações de banco de dados. A lógica principal reside em `lib/chatwoot_app.rb`.

### Modos de Operação
1.  **Community Edition (CE):** Padrão do repositório open-source. A pasta `enterprise/` não existe ou `ChatwootApp.enterprise?` retorna falso.
2.  **Enterprise Edition (EE):** Ativado se a pasta `enterprise/` estiver presente na raiz do projeto.
3.  **Cloud:** Modo usado pela versão SaaS (`app.chatwoot.com`), ativado se `DEPLOYMENT_ENV=cloud`.

### Validação de Licença (Enterprise)
Mesmo com o código Enterprise presente, funcionalidades premium requerem uma validação de licença via Chatwoot Hub.
*   O Hub retorna o `pricing_plan` e `pricing_plan_quantity` (limite de agentes).
*   Esses valores são armazenados na tabela `installation_configs` (`INSTALLATION_PRICING_PLAN`).
*   Se o plano for `community`, as features Enterprise permanecem bloqueadas.
*   Planos conhecidos: `community`, `premium`, `enterprise`, `startup`.

### Como Alterar Manualmente (Rake Tasks)
Existe uma tarefa rake (`lib/tasks/dev/variant_toggle.rake`) que permite alterar o plano de preços para fins de desenvolvimento/teste:
```bash
rake chatwoot:variant_toggle:enterprise # Ativa o plano enterprise
rake chatwoot:variant_toggle:community  # Reverte para community
```
**Atenção:** Alterar isso em produção sem uma licença válida viola os termos de uso do software Enterprise.

### Features Bloqueadas ("Ocultas")
As seguintes funcionalidades existem no código (`enterprise/app`), mas são bloqueadas via software (`app/helpers/super_admin/features.yml`) se a licença não for válida:
*   **SAML SSO** (Single Sign-On).
*   **Audit Logs** (Logs de auditoria).
*   **Agent Capacity** (Gestão de capacidade de atendimento).
*   **SLA Management** (Acordos de Nível de Serviço).
*   **Custom Branding** (Remoção da marca "Powered by Chatwoot").
*   **Captain** (Funcionalidades avançadas de IA).

## 3. Integrações e Serviços Externos

Além dos canais de comunicação configurados pelo usuário, o sistema possui integrações nativas:

*   **OpenTelemetry:** O código possui instrumentação para OpenTelemetry (`lib/opentelemetry_config.rb`), permitindo exportar traces para serviços como Langfuse ou Honeycomb, útil para monitoramento de LLMs.
*   **Gravatar:** Utilizado para buscar avatares de usuários baseados no e-mail.
*   **Chatwoot Support:** O painel Super Admin carrega scripts de suporte (`support_script_url`) dinamicamente do Hub, permitindo que a equipe da Chatwoot ofereça suporte via chat dentro da instância self-hosted (se habilitado).

## 4. Segurança e "Backdoors"

Após análise do código:
*   **Não foram encontrados backdoors intencionais:** Não há usuários hardcoded ou senhas mestras no código fonte (`db/seeds.rb` e controllers de autenticação foram auditados).
*   **Acesso Administrativo:** A criação de novas contas via API (`Api::V1::AccountsController`) é protegida pela configuração `ENABLE_ACCOUNT_SIGNUP`. Se desabilitada, apenas Super Admins podem criar contas.
*   **Dados Sensíveis:** As chaves de API de integrações (Facebook, Twilio, etc.) são salvas no banco de dados. Recomenda-se proteger o acesso ao banco e usar variáveis de ambiente onde possível.

## 5. Arquivos de Interesse para Auditoria
*   `lib/chatwoot_hub.rb`: Lógica de comunicação com a Chatwoot Inc.
*   `lib/chatwoot_app.rb`: Lógica de detecção de edição (Enterprise/Community).
*   `app/jobs/internal/check_new_versions_job.rb`: Agendamento da telemetria.
*   `enterprise/app/`: Código fonte das funcionalidades Enterprise.
*   `lib/tasks/dev/variant_toggle.rake`: Tarefa para ativar modo Enterprise em dev.
