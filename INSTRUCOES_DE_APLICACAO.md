# Instruções de Aplicação do Patch para Buscar Anexos de Contatos

Este documento explica como aplicar e validar as alterações criadas para adicionar a nova rota `GET /api/v1/accounts/:account_id/contacts/:contact_id/attachments` em seu ambiente Chatwoot, sem a necessidade de uma recompilação completa do frontend.

## 1. Arquivos Modificados ou Criados

Para a rota funcionar, os seguintes arquivos foram criados ou editados. Você deve refletir essas mudanças em seu ambiente de produção (por exemplo, acessando seu container Docker em `/app`).

### A. Criar Controlador de Anexos

Crie o arquivo: `app/controllers/api/v1/accounts/contacts/attachments_controller.rb`
Com o seguinte conteúdo:

```ruby
class Api::V1::Accounts::Contacts::AttachmentsController < Api::V1::Accounts::Contacts::BaseController
  def index
    conversations = Current.account.conversations.where(contact_id: @contact.id)

    # Apply permission-based filtering
    conversations = Conversations::PermissionFilterService.new(
      conversations,
      Current.user,
      Current.account
    ).perform

    # Use basic pagination or just load what's requested. We will use `pluck(:id)` safely by joining correctly.
    # To improve performance, we just join messages to the filtered conversations subquery.
    @attachments = Attachment.joins(:message)
                             .where(messages: { conversation_id: conversations.select(:id) })
                             .includes(message: :sender)
                             .order('attachments.created_at DESC')

    return if params[:file_type].blank?

    @attachments = @attachments.where(file_type: params[:file_type])
  end
end
```

### B. Criar View do Jbuilder

Crie o arquivo: `app/views/api/v1/accounts/contacts/attachments/index.json.jbuilder`
Com o seguinte conteúdo:

```ruby
json.payload @attachments do |attachment|
  json.message_id attachment.push_event_data[:message_id]
  json.thumb_url attachment.push_event_data[:thumb_url]
  json.data_url attachment.push_event_data[:data_url]
  json.file_size attachment.push_event_data[:file_size]
  json.file_type attachment.push_event_data[:file_type]
  json.extension attachment.push_event_data[:extension]
  json.width attachment.push_event_data[:width]
  json.height attachment.push_event_data[:height]
  json.created_at attachment.message.created_at.to_i
  json.sender attachment.message.sender.push_event_data if attachment.message.sender
end
```

### C. Modificar Rotas

No arquivo `config/routes.rb`, localize o escopo de módulos `contacts` (`scope module: :contacts`) e adicione a rota para `attachments`, da seguinte maneira:

```ruby
<<<<<<< SEARCH
            scope module: :contacts do
              resources :conversations, only: [:index]
              resources :contact_inboxes, only: [:create]
              resources :labels, only: [:create, :index]
              resources :notes
=======
            scope module: :contacts do
              resources :conversations, only: [:index]
              resources :contact_inboxes, only: [:create]
              resources :labels, only: [:create, :index]
              resources :notes
              resources :attachments, only: [:index]
>>>>>>> REPLACE
```

## 2. Aplicando no Docker

1. Copie e aplique os três arquivos mencionados nas suas respectivas localizações dentro da pasta da aplicação Chatwoot, ex: `/app/`.
2. Como se tratam de mudanças de Backend (Rails), basta **reiniciar** o serviço/container para que as novas rotas e classes entrem em vigor. Não há necessidade de rodar pacotes do npm, yarn, pnpm ou rake para *assets precompile*.

```bash
docker restart nome_do_seu_container_rails_chatwoot
```

## 3. Uso da API e Testes Práticos

A nova rota aceita o cabeçalho de autenticação de rotina da API do Chatwoot (seu `api_access_token` no header ou autenticação baseada em sessão de Cookie).

**Endpoint:**
`GET /api/v1/accounts/:account_id/contacts/:contact_id/attachments`

**Exemplos de Filtros Suportados:**
Você pode filtrar por um tipo específico de mídia ou arquivo usando o query param `file_type`. Por exemplo, para puxar apenas as imagens, links, ou vídeos de um contato, utilize as enumerações pré-definidas no Chatwoot para `file_type` (como `image`, `video`, `audio`, `file`, etc).

`GET /api/v1/accounts/1/contacts/50/attachments?file_type=image`
`GET /api/v1/accounts/1/contacts/50/attachments?file_type=audio`
`GET /api/v1/accounts/1/contacts/50/attachments?file_type=video`
