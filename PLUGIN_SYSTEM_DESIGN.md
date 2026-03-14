# Arquitetura e Guia de Desenvolvimento: Sistema de Plugins Dinâmicos para Chatwoot

Este documento descreve o design e as instruções de implementação para adicionar um sistema de plugins dinâmico ao Chatwoot. Este sistema permite a instalação de extensões via upload de arquivo `.zip` através do painel Super Admin, sem a necessidade de recompilar a imagem Docker do Chatwoot.

## 1. Visão Geral da Arquitetura

O sistema de plugins é composto por três partes principais:

1. **Gestão e Armazenamento (Super Admin):** Interface no `/super_admin` para upload de pacotes `.zip`. O código extraído será salvo em um volume persistente (ex: `/app/storage/plugins`) para sobreviver a reinicializações do Docker.
2. **Backend Dinâmico (Ruby on Rails):** Carregamento de rotas, controladores e serviços em tempo de execução. O sistema carregará os arquivos `.rb` do plugin e injetará as rotas definidas.
3. **Frontend Dinâmico (Vue 3):** Carregamento de módulos JavaScript compilados (ES Modules ou UMD) diretamente no navegador do cliente, injetando componentes em "slots" predefinidos da interface (ex: Sidebar do Chat, Nova Aba Principal para um Kanban).

### Fluxo de Funcionamento
1. O Super Admin faz o upload do `.zip` do plugin.
2. O Chatwoot valida o `manifest.json` do pacote, extrai os arquivos e registra o plugin no banco de dados (tabela `plugins`).
3. O Super Admin pode habilitar o plugin globalmente ou para Contas (Accounts) específicas.
4. No acesso de um usuário ao painel (Dashboard), o frontend consulta `/api/v1/plugins` para listar os plugins ativos na conta atual.
5. O frontend injeta os scripts JavaScript de cada plugin.
6. Os scripts do plugin registram seus componentes Vue no ecossistema do Chatwoot através de uma API Global (`window.ChatwootPluginRegistry`).

---

## 2. Estrutura de Banco de Dados Necessária

Para suportar o sistema, duas novas tabelas são sugeridas:

```ruby
# Tabela de registro global dos plugins
create_table :plugins do |t|
  t.string :name, null: false
  t.string :identifier, null: false, unique: true # ex: "kanban-board"
  t.string :version, null: false
  t.text :description
  t.string :author
  t.boolean :active, default: true
  t.timestamps
end

# Tabela de ativação por Conta (Account)
create_table :account_plugins do |t|
  t.references :account, null: false, foreign_key: true
  t.references :plugin, null: false, foreign_key: true
  t.jsonb :settings, default: {} # Configurações específicas da conta (ex: tokens de API)
  t.boolean :active, default: true
  t.timestamps
end
```

---

## 3. Como Desenvolver um Plugin

Um plugin do Chatwoot deve ser empacotado como um arquivo `.zip` contendo uma estrutura específica.

### Estrutura do Arquivo `.zip`

```text
meu-plugin.zip
│
├── manifest.json         # Metadados essenciais e pontos de montagem
├── backend/
│   ├── routes.rb         # Rotas da API customizada (ex: /api/v1/plugins/meu_plugin/...)
│   ├── controllers/      # Controladores Rails
│   └── models/           # (Opcional) Modelos isolados
└── frontend/
    ├── dist/
    │   ├── plugin.js     # Arquivo JavaScript compilado (Vue 3 / ES Module)
    │   └── style.css     # Estilos CSS compilados
    └── assets/           # Imagens, ícones
```

### O Arquivo `manifest.json`

Define as permissões, informações visuais e o ponto de entrada do plugin.

```json
{
  "identifier": "chatwoot-gallery-plugin",
  "name": "Galeria de Mídias",
  "version": "1.0.0",
  "author": "Sua Empresa",
  "description": "Adiciona uma aba de galeria de mídias na barra lateral do contato.",
  "permissions": ["read_conversations", "read_contacts"],
  "entrypoints": {
    "backend": "backend/routes.rb",
    "frontend": "frontend/dist/plugin.js",
    "stylesheet": "frontend/dist/style.css"
  }
}
```

---

## 4. Integração no Backend (Ruby on Rails)

Como o sistema Rails não é recompilado, os arquivos do plugin não podem definir *Migrations* tradicionais (alterar tabelas nativas do Chatwoot). O plugin deve usar o campo `custom_attributes` ou usar as tabelas padrão do sistema via API.

**Carregamento Dinâmico de Código (Exemplo de Implementação):**
Na inicialização (initializer) ou após o upload dinâmico, o Chatwoot executará:

```ruby
# lib/plugin_loader.rb
Plugin.where(active: true).each do |plugin|
  # Carrega as rotas
  routes_file = Rails.root.join("storage", "plugins", plugin.identifier, "backend", "routes.rb")
  load routes_file if File.exist?(routes_file)

  # Adiciona os diretórios do plugin ao autoload path do Rails
  controllers_dir = Rails.root.join("storage", "plugins", plugin.identifier, "backend", "controllers")
  ActiveSupport::Dependencies.autoload_paths << controllers_dir.to_s if Dir.exist?(controllers_dir)
end
```

**Exemplo de Controle (backend/controllers/gallery_controller.rb):**
```ruby
class Plugins::GalleryController < ApplicationController
  before_action :authenticate_user!

  def index
    # Retorna todas as mídias anexadas das conversas de um contato
    contact = Current.account.contacts.find(params[:contact_id])
    attachments = Attachment.where(message_id: contact.messages.pluck(:id)).select(&:image?)
    render json: attachments
  end
end
```

---

## 5. Integração no Frontend (Vue 3)

Os desenvolvedores devem criar seu frontend usando Vue 3 e empacotá-lo como um arquivo JavaScript único (ex: usando Vite com `build.rollupOptions.output.format = 'iife'` ou `'es'`).

### A API de Registro (Global Frontend API)

O Chatwoot irá injetar no objeto `window` os métodos para registrar componentes na UI:

```javascript
// Exemplo do que o frontend do Chatwoot provê para o desenvolvedor:
window.ChatwootPluginRegistry = {
  registerSidebarWidget: (identifier, component, icon, title) => { ... },
  registerMainTab: (identifier, component, icon, title) => { ... },
  registerMessageAction: (identifier, actionCallback, icon, label) => { ... }
};
```

### Exemplo de código do Plugin (`frontend/src/main.js`):

O desenvolvedor cria o componente Vue para a Galeria ou Kanban.

```javascript
import GalleryWidget from './components/GalleryWidget.vue';
import KanbanBoard from './components/KanbanBoard.vue';

// Este código é executado assim que o Chatwoot carregar o plugin.js
if (window.ChatwootPluginRegistry) {

  // Exemplo 1: Plugin de Galeria na lateral do chat
  window.ChatwootPluginRegistry.registerSidebarWidget(
    'contact-gallery',
    GalleryWidget,
    'i-lucide-image', // Usa o padrão Lucide de ícones já nativo do chatwoot
    'Galeria de Mídias'
  );

  // Exemplo 2: Plugin de Kanban como uma nova tela inteira
  window.ChatwootPluginRegistry.registerMainTab(
    'kanban-crm',
    KanbanBoard,
    'i-lucide-trello',
    'Kanban de Atendimentos'
  );
}
```

### Segurança e Contexto no Frontend

Dentro do componente Vue do plugin (ex: `GalleryWidget.vue`), o Chatwoot passará dados em tempo real (props) ou disponibilizará *composables* expostos:

```vue
<script setup>
import { inject, ref, onMounted } from 'vue';

// O Chatwoot injeta o ID do contato atual e a conta
const currentContact = inject('currentContact');
const apiToken = inject('currentUserToken'); // (Apenas com permissão no manifest)

const images = ref([]);

onMounted(async () => {
  // O plugin chama a API customizada instalada no backend pelo mesmo zip
  const response = await fetch(`/api/v1/plugins/gallery/${currentContact.value.id}`, {
    headers: { 'Authorization': apiToken.value }
  });
  images.value = await response.json();
});
</script>

<template>
  <div class="gallery-container">
    <img v-for="img in images" :src="img.url" :key="img.id" />
  </div>
</template>
```

---

## 6. Administração no Super Admin

No painel `/super_admin`:

1. **Upload:** Um botão "Upload Plugin". O arquivo `.zip` é extraído para `/app/storage/plugins/{identifier}`.
2. **Listagem:** Tabela listando todos os plugins em `/storage/plugins`.
3. **Distribuição:** O Super Admin pode clicar em "Gerenciar Contas" dentro do plugin e marcar quais IDs de Conta (Accounts) terão acesso. Alternativamente, os administradores de uma Conta (via API normal `/api/v1/accounts/1/plugins`) poderão "ativar" os plugins permitidos para eles.

## 7. Preocupações Críticas e Segurança

1. **Execução de Código Arbitrário:** Permitir upload de `.rb` significa que o Super Admin tem poder de alterar todo o backend. Apenas Administradores de Infraestrutura (Super Admin) podem fazer upload dos ZIPs. Usuários comuns (Account Admins) apenas **ativam** plugins já auditados e enviados pelo Super Admin.
2. **Reinicialização de Rotas (Hot Reload):** No Rails, adicionar rotas dinâmicas em produção pode exigir a chamada de `Rails.application.reload_routes!` após o upload do plugin para que os novos endpoints passem a funcionar imediatamente sem reiniciar o container Docker.
3. **Servindo Arquivos Estáticos:** O Nginx ou o próprio servidor Rails (`ActionDispatch::Static`) deverá ser configurado para servir arquivos públicos dos plugins (ex: servir `/storage/plugins/galeria/frontend/dist/plugin.js` através da rota `/plugins/galeria/plugin.js`).
