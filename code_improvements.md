# Sugestões de Melhorias no Código

## 1. Refatoração do Backend (Ruby on Rails)

### A. Desacoplamento e Clean Architecture
*   **Query Objects:** Extrair a lógica complexa de filtros do `ConversationFinder` para Query Objects específicos (ex: `Conversations::ByStatusQuery`, `Conversations::SearchQuery`). Isso facilita testes unitários e recomposição.
*   **Service Objects Puros:** Migrar lógica de negócio dos Controllers e Models para Service Objects com responsabilidade única. Ex: Em vez de `conversation.toggle_status`, ter `Conversations::ToggleStatus.call(conversation: conversation, actor: current_user)`. Isso centraliza regras de negócio, autorização e efeitos colaterais (logs, webhooks).
*   **Data Transfer Objects (DTOs):** Evitar passar `params` (Hash) diretamente para as camadas profundas. Definir classes simples (Struct ou `dry-struct`) para representar os dados de entrada de um serviço. Isso torna o contrato da API interna explícito.

### B. Otimização de Banco de Dados
*   **Full Text Search:** Substituir consultas `ILIKE` por `pg_search` ou implementar índices GIN/GiST no PostgreSQL para buscas textuais performáticas e escaláveis.
*   **Contadores em Cache:** Utilizar colunas de contador (`counter_cache`) ou Redis para métricas acessadas frequentemente (ex: número de mensagens não lidas), evitando `COUNT(*)` repetitivos.

### C. Testes
*   **Aumentar Cobertura:** Priorizar testes de integração (Request Specs) para garantir que os fluxos completos (API -> Service -> DB -> Job) funcionem conforme esperado, simulando cenários reais de erro.
*   **Factories:** Padronizar o uso de Factories (FactoryBot) para criar estados complexos de teste, evitando fixtures frágeis.

## 2. Refatoração do Frontend (Vue.js)

### A. Migração para Vue 3 Composition API
*   Embora o projeto já utilize Vue 3, garantir que novos componentes e refatorações utilizem a Composition API (`<script setup>`). Isso facilita a extração de lógica reutilizável em "Composables" (hooks customizados), substituindo Mixins e tornando o código mais legível.

### B. Gestão de Estado
*   **Pinia:** Considerar migrar do Vuex para Pinia, que oferece melhor inferência de tipos (TypeScript), modularidade e DevTools mais intuitivos.
*   **Optimistic UI:** Implementar atualizações otimistas na interface de chat. Ao enviar uma mensagem, exibi-la imediatamente como "enviando" antes da confirmação do servidor, melhorando a percepção de performance.

### C. TypeScript
*   Expandir o uso de TypeScript para garantir tipagem estática nas props dos componentes e nas respostas da API. Isso reduz bugs de runtime (ex: acessar propriedade de `undefined`).

## 3. Infraestrutura e DevOps
*   **Background Jobs:** Garantir que todas as chamadas a APIs externas (webhooks, integrações) sejam executadas em background jobs (Sidekiq) com retentativas automáticas e backoff exponencial.
*   **Observabilidade:** Implementar tracing distribuído (OpenTelemetry ou New Relic) para identificar gargalos de performance em tempo real nas requisições da API.
