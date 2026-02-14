# Documentação do Painel Super Admin

## Visão Geral
O Painel Super Admin é uma interface administrativa exclusiva para os donos da instância do Chatwoot (quem hospeda o software). Diferente da Dashboard do Cliente, esta área não é uma Single Page Application (SPA) em Vue.js, mas sim uma aplicação Rails clássica renderizada no servidor (Server-Side Rendering) utilizando a gem `administrate`.

## Acesso e Segurança
*   **Rota Base:** `/super_admin`
*   **Autenticação:** Utiliza `Devise` com o modelo `SuperAdmin`.
*   **Controle:** Controllers herdam de `SuperAdmin::ApplicationController`, que verifica a autenticação do super administrador.

## Funcionalidades Principais

### 1. Dashboard (`/super_admin`)
*   **Controller:** `SuperAdmin::DashboardController`
*   **Visualização:** Exibe métricas globais da instância:
    *   Total de Contas (`Account.count`)
    *   Total de Usuários (`User.count`)
    *   Total de Caixas de Entrada (`Inbox.count`)
    *   Total de Conversas (`Conversation.count`)
    *   Gráfico de conversas dos últimos 30 dias (via `group_by_day`).

### 2. Gestão de Contas (`/super_admin/accounts`)
*   **Controller:** `SuperAdmin::AccountsController`
*   **Modelo:** `Account`
*   **Funcionalidades:**
    *   **Listagem:** Ver todas as contas criadas na instância.
    *   **Criação/Edição:** Criar novas contas ou editar limites e configurações.
    *   **Ações Especiais:**
        *   `seed`: Popula a conta com dados de exemplo (contatos, conversas) via `Internal::SeedAccountJob`. Útil para demos.
        *   `reset_cache`: Limpa chaves de cache da conta.
        *   `destroy`: Exclui a conta assincronamente (`DeleteObjectJob`).
    *   **Feature Flags:** Permite habilitar/desabilitar recursos específicos por conta (ex: Team, Campaigns, Help Center).

### 3. Configurações da Aplicação (`/super_admin/app_config`)
*   **Controller:** `SuperAdmin::AppConfigsController`
*   **Objetivo:** Interface amigável para configurar variáveis de ambiente e integrações sem precisar reiniciar o servidor (quando suportado).
*   **Categorias de Configuração:**
    *   **Geral:** Uploads, SignUp habilitado.
    *   **Integrações:** Facebook, Shopify, Slack, Linear, Notion, Google.
    *   **AI (Captain):** Configuração de chaves e modelos da OpenAI.
    *   **Email:** Limites de envio e domínio de inbound.
*   **Funcionamento:** Os valores são salvos na tabela `installation_configs` e carregados dinamicamente.

### 4. Configurações de Instalação (`/super_admin/installation_configs`)
*   **Controller:** `SuperAdmin::InstallationConfigsController`
*   **Objetivo:** CRUD genérico para a tabela `installation_configs`. Permite editar qualquer chave de configuração que esteja marcada como "editável". É uma visão mais "crua" que a `AppConfigsController`.

### 5. Gestão de Usuários (`/super_admin/users`)
*   **Controller:** `SuperAdmin::UsersController`
*   **Funcionalidade:** Ver todos os usuários da plataforma, editar dados ou excluir.

### 6. Status da Instância (`/super_admin/instance_status`)
*   **Funcionalidade:** Verifica a saúde dos serviços dependentes (Redis, Postgres, etc.) e versões do software.

## Estrutura de Código
*   **Views:** Localizadas em `app/views/super_admin`. São templates ERB (HTML + Ruby).
*   **Controllers:** `app/controllers/super_admin/`. A maioria herda o comportamento padrão de CRUD do `Administrate`, sobrescrevendo apenas o necessário (`resource_params`, `scoped_resource`).

## Diferenças para a Dashboard do Cliente
*   **Renderização:** Server-side (Rails) vs Client-side (Vue.js).
*   **Escopo:** Instância inteira (todas as contas) vs Conta específica.
*   **Público:** DevOps/Admin do Servidor vs Agentes/Gerentes de Suporte.
