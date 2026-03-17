import BotTabComponent from './components/BotTabComponent.vue';

if (window.ChatwootPluginRegistry) {
  window.ChatwootPluginRegistry.registerConversationListTab(
    'bot_tab', // identifier
    BotTabComponent, // Vue 3 Component
    'icon-robot-line', // Icon (not strictly used by tabs right now but good for API)
    'Bot' // Title
  );

  console.log("Chatwoot Bot Tab Plugin: Carregado e registrado com sucesso!");
} else {
  console.error("Chatwoot Bot Tab Plugin: O 'window.ChatwootPluginRegistry' não foi encontrado.");
}