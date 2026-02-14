# Documentação das Integrações

## Visão Geral
O Chatwoot é agnóstico em relação ao canal de comunicação. Ele normaliza mensagens de diferentes fontes (Facebook, WhatsApp, Email, Twitter, etc.) em uma estrutura comum: `Conversation` e `Message`.

## Arquitetura de Integração

### 1. Modelos de Canal (`app/models/channel/`)
Cada integração possui um modelo correspondente que armazena as credenciais e configurações específicas.
*   `Channel::FacebookPage`: Page ID, User Access Token.
*   `Channel::TwitterProfile`: Consumer Key, Secret, Access Token.
*   `Channel::Whatsapp`: Phone Number ID, Verify Token, API Key (se usar BSP como Twilio ou 360Dialog).
*   `Channel::Email`: IMAP/SMTP settings.
*   `Channel::WebWidget`: Configurações do widget de chat (cor, saudação).

### 2. Webhooks de Entrada (`app/controllers/webhooks/`)
Os webhooks são o ponto de entrada para mensagens iniciadas pelo contato.
*   **Rotas:** Definidas em `config/routes.rb` (ex: `post 'webhooks/whatsapp/:phone_number'`).
*   **Responsabilidade:**
    1.  Verificar a autenticidade da requisição (assinatura HMAC ou token).
    2.  Identificar o canal correspondente (via ID na URL ou payload).
    3.  Invocar o serviço de processamento (Service Object).

### 3. Camada de Serviço (`app/services/`)
A lógica de negócio reside aqui, organizada por canal (ex: `app/services/whatsapp/`).

#### Processamento de Mensagens Recebidas (`IncomingMessageService`)
Padrão comum em todas as integrações:
1.  **Parse:** Extrair remetente, conteúdo e anexos do payload JSON.
2.  **Contact:** Buscar contato existente pelo identificador (telefone, email, PSID) ou criar novo.
3.  **Conversation:** Buscar conversa aberta ou criar nova.
4.  **Message:** Criar registro `Message` no banco de dados.
5.  **Anexos:** Processar e salvar arquivos no ActiveStorage.

#### Envio de Mensagens (`SendOnChannelService`)
Quando um agente responde na dashboard:
1.  O controller chama o serviço de envio específico do canal (ex: `Whatsapp::SendOnWhatsappService`).
2.  O serviço formata a mensagem para a API do provedor (Twilio, Facebook Graph API, etc.).
3.  Realiza a requisição HTTP.
4.  Atualiza o status da mensagem (sent, delivered, read) via callbacks futuros.

## Detalhe por Canal

### WhatsApp (Cloud API & BSPs)
*   **Model:** `Channel::Whatsapp`
*   **Services:** `app/services/whatsapp/`
*   **Fluxo:**
    *   Recebe payload via POST no `Webhooks::WhatsappController`.
    *   `IncomingMessageService` processa texto, imagem, áudio e localização.
    *   Suporta modelos de mensagem (Templates) para início de conversa ativa (Business Initiated).

### Facebook Messenger & Instagram
*   **Gems:** Utiliza a gem `facebook-messenger` montada em `/bot`.
*   **Configuração:** Requer App ID e App Secret no `Super Admin > App Configs`.
*   **Human Agent Tag:** Implementa a tag "Human Agent" para permitir respostas após a janela de 24h (se aprovado pelo FB).

### Email
*   **Entrada:**
    *   **IMAP:** Um job agendado (`Imap::FetchEmailJob`) consulta a caixa postal periodicamente.
    *   **Inbound Parse (SendGrid/Postmark):** Recebe o email via webhook parseado.
*   **Saída:** Utiliza `ActionMailer` (SMTP ou API) para enviar respostas.
*   **Lógica:** `Mailbox::ConversationFinder` (ou similar) agrupa emails em conversas baseadas no `In-Reply-To` e `References` headers.

### SMS (Twilio/Bandwidth/Outros)
*   **Model:** `Channel::Sms`
*   **Provider:** Abstração para suportar múltiplos provedores.
*   **Fluxo:** Webhook simples recebendo `From`, `Body`. Resposta via API REST do provedor.

### API Channel
*   **Model:** `Channel::Api`
*   **Uso:** Para integrar canais customizados (ex: App próprio, Chat in-game).
*   **Funcionamento:** O desenvolvedor envia requisições POST para criar mensagens e contatos. Webhooks de saída notificam o sistema externo sobre respostas do agente.

## Webhooks de Saída (Eventos do Sistema)
Além de receber mensagens, o Chatwoot envia eventos para sistemas externos (configuráveis em `Settings > Integrations > Webhooks`).
*   **Eventos:** `message_created`, `conversation_created`, `contact_updated`, etc.
*   **Uso:** Sincronizar dados com CRMs externos, disparar automações, analytics.
