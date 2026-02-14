# Possíveis Falhas e Problemas Identificados

## 1. Performance de Banco de Dados (PostgreSQL)
*   **Busca Textual Ineficiente:** O serviço `ConversationFinder` utiliza `ILIKE` com curingas (`%query%`) para buscar mensagens. Em tabelas com milhões de registros (`messages`), isso força um "Sequential Scan" (leitura completa da tabela), ignorando índices padrão. Isso degradará severamente a performance conforme o volume de dados cresce.
    *   **Solução:** Implementar Full Text Search (FTS) do PostgreSQL com índices GIN/GiST ou utilizar `pg_search`.
*   **Consultas N+1:** Embora o código utilize `includes`, a complexidade das associações (Contacts, Inboxes, Assignees, Avatars) em listas longas pode gerar queries N+1 se não monitoradas constantemente, especialmente em serializadores JSON customizados.

## 2. Complexidade e Manutenibilidade do Código
*   **Fat Models:** O modelo `Conversation` (`app/models/conversation.rb`) possui muitas responsabilidades: validações, callbacks de ciclo de vida, lógica de status, despacho de eventos, helpers de data. Isso viola o Princípio da Responsabilidade Única (SRP) e dificulta testes unitários isolados.
*   **Lógica em Callbacks:** O uso excessivo de `after_create_commit` e `after_update_commit` para disparar eventos e webhooks torna o fluxo de execução implícito e difícil de debugar. Se uma transação falhar silenciosamente ou um callback levantar erro, o estado do sistema pode ficar inconsistente.
*   **Acoplamento em Services:** Alguns services (ex: `ConversationBuilder`) recebem o objeto `params` inteiro do controller. Isso cria um acoplamento forte com a camada HTTP e dificulta saber quais parâmetros são realmente necessários pela lógica de negócio.

## 3. Segurança
*   **Permissive Params:** Em alguns controllers, `params.permit!` ou hashs de atributos são passados diretamente para services. Embora o Rails filtre mass assignment no model, passar `params` brutos para services aumenta o risco de injeção de parâmetros não intencionais se a validação no service for frouxa.
*   **Autorização:** A lógica de autorização (Pundit) está misturada com a lógica de filtro (`Conversations::PermissionFilterService`). Idealmente, a autorização deve ser uma guarda antes da execução da query, não parte da construção da query.

## 4. Frontend (Vue.js)
*   **Gestão de Estado:** A store do Vuex (ou Pinia) parece conter lógicas de negócio complexas que poderiam estar em services/composables. O arquivo `store/modules/conversations.js` tende a crescer indefinidamente.
*   **Dependência de WebSockets:** A interface assume conexão constante. Em redes instáveis (mobile), a reconexão e sincronização de estado (mensagens perdidas durante a desconexão) é um desafio arquitetural complexo e propenso a falhas de "estado fantasma".

## 5. Integrações
*   **Webhooks de Terceiros:** A falha no processamento de um webhook (ex: erro 500 ao salvar mensagem do WhatsApp) pode fazer com que o provedor (Meta/Twilio) desative o webhook após várias tentativas falhas. O tratamento de erros precisa ser robusto e idempotente para evitar perda de mensagens ou desativação do canal.
