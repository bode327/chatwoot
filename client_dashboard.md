# Documentação da Dashboard do Cliente (Client Dashboard)

## Visão Geral
A Dashboard do Cliente é a interface principal onde agentes e administradores interagem com o sistema Chatwoot. Ela é construída como uma Single Page Application (SPA) utilizando Vue.js, comunicando-se com o backend Ruby on Rails através de uma API RESTful.

## Estrutura do Frontend (`app/javascript/dashboard`)

A aplicação Vue.js é organizada modularmente. As rotas principais são definidas em `routes/dashboard/dashboard.routes.js`.

### Principais Componentes e Funcionalidades

1.  **Conversas (`/app/accounts/:id/conversations`)**
    *   **Localização:** `app/javascript/dashboard/routes/dashboard/conversation`
    *   **Funcionalidade:** Interface de chat em tempo real. Permite enviar mensagens, anexos, notas privadas e gerenciar o status da conversa (Aberto, Resolvido, Pendente, Adiado).
    *   **Store:** `store/modules/conversations`, `store/modules/contactConversations`.
    *   **Detalhes:** Utiliza WebSockets (ActionCable) para atualizações em tempo real de novas mensagens e status de digitação.

2.  **Contatos (`/app/accounts/:id/contacts`)**
    *   **Localização:** `app/javascript/dashboard/routes/dashboard/contacts`
    *   **Funcionalidade:** Gestão de CRM (Customer Relationship Management). Permite criar, editar, fundir (merge) e excluir contatos.
    *   **Store:** `store/modules/contacts`.

3.  **Configurações (`/app/accounts/:id/settings`)**
    *   **Localização:** `app/javascript/dashboard/routes/dashboard/settings`
    *   **Funcionalidade:** Administração da conta específica.
        *   **Caixas de Entrada (Inboxes):** Configuração de canais (Website, Facebook, Email, API, etc.).
        *   **Agentes:** Convite e gestão de níveis de acesso (Agente, Administrador).
        *   **Equipes:** Agrupamento de agentes.
        *   **Etiquetas (Labels):** Gestão de tags para categorização.
        *   **Respostas Prontas (Canned Responses):** Modelos de resposta rápida.
        *   **Automação:** Regras para atribuição automática e triagem.

4.  **Relatórios (`/app/accounts/:id/reports`)**
    *   **Localização:** `routes/dashboard/reports` (embora a lógica esteja distribuída).
    *   **Funcionalidade:** Visualização de métricas de desempenho.
    *   **Store:** `store/modules/reports`, `store/modules/summaryReports`.

## Estrutura do Backend (API)

A API serve os dados para o frontend. A maioria dos endpoints está sob `namespace :api do namespace :v1`.

### 1. Conversas (`Api::V1::Accounts::ConversationsController`)
*   **Arquivo:** `app/controllers/api/v1/accounts/conversations_controller.rb`
*   **Responsabilidade:** CRUD de conversas, filtros e ações de controle.
*   **Principais Actions:**
    *   `index`: Lista conversas. Utiliza `ConversationFinder` para aplicar filtros complexos (status, atribuição, time, busca).
    *   `create`: Cria uma nova conversa (geralmente via API ou widget).
    *   `toggle_status`: Alterna entre Aberto/Resolvido ou define status específico (Pendente, Adiado).
    *   `assign`: Atribui a conversa a um agente ou time.
*   **Modelo Principal:** `Conversation` (`app/models/conversation.rb`).
    *   Possui estados: `open`, `resolved`, `pending`, `snoozed`.
    *   Associações: `Contact`, `Inbox`, `Assignee` (User), `Messages`.

### 2. Mensagens (`Api::V1::Accounts::Conversations::MessagesController`)
*   **Responsabilidade:** Gestão das mensagens dentro de uma conversa.
*   **Lógica:** Utiliza `Messages::MessageBuilder` para criar mensagens, tratar anexos e disparar eventos (webhooks, notificações).

### 3. Relatórios (`Api::V2::Accounts::ReportsController`)
*   **Arquivo:** `app/controllers/api/v2/accounts/reports_controller.rb`
*   **Responsabilidade:** Fornecer dados agregados para gráficos.
*   **Builders:** Delega a lógica pesada para classes em `app/models/v2/reports/` e `app/builders/v2/reports/`.
    *   `Conversations::ReportBuilder`: Métricas de volume de conversas.
    *   `Conversations::MetricBuilder`: Métricas de KPI (tempo de resposta, resolução).
*   **Actions:** `summary`, `agents`, `inboxes`, `labels`, `conversation_traffic` (heatmap).

### 4. Busca e Filtros (`ConversationFinder`)
*   **Arquivo:** `app/finders/conversation_finder.rb`
*   **Função:** Classe central para query de conversas.
*   **Lógica:** Recebe parâmetros do frontend (status `open`, assigne_type `me`, labels, etc.) e constrói a query SQL dinâmica. É um ponto crítico de performance.

## Fluxo de Dados (Exemplo: Carregar Conversas)
1.  **Frontend:** Componente `ConversationList` dispara action `fetchConversations` na Store.
2.  **API Request:** `GET /api/v1/accounts/:id/conversations?status=open&assignee_type=me`.
3.  **Controller:** `ConversationsController#index` instancia `ConversationFinder`.
4.  **Finder:** `ConversationFinder#perform` aplica filtros na tabela `conversations`.
5.  **Response:** Retorna JSON com lista de conversas e contadores (meta data).
6.  **Frontend:** Store atualiza o estado, Vue reage e renderiza a lista.

## Pontos de Atenção
*   **Performance:** O `ConversationFinder` realiza muitas junções (joins). O filtro por busca textual (`params[:q]`) utiliza `ILIKE`, o que pode ser lento em grandes bases.
*   **Tempo Real:** O sistema depende fortemente de ActionCable (WebSockets). Falhas na conexão WebSocket degradam a experiência (mensagens não aparecem sem refresh).
