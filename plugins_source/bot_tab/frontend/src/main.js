import BotTabComponent from './components/BotTabComponent.vue';

// Background Polling function to keep tab counter updated dynamically
// even if the user never clicks the "Bot" tab.
const startBotTabPolling = () => {
  const store = window.$chatwootStore;

  const getAccountId = () => {
    if (store?.getters?.getCurrentAccountId) return store.getters.getCurrentAccountId;
    const urlMatch = window.location.pathname.match(/\/accounts\/(\d+)\//);
    if (urlMatch) return urlMatch[1];
    return 1;
  };

  const fetchCount = async () => {
    try {
      const accountId = getAccountId();
      const axios = window.axios || window.ChatwootAxios;

      if (!axios) return;

      const requests = [
        axios.get(`/api/v1/accounts/${accountId}/conversations`, { params: { status: 'pending', sort_by: 'last_activity_at' } }),
        axios.get(`/api/v1/accounts/${accountId}/conversations`, { params: { status: 'snoozed', sort_by: 'last_activity_at' } })
      ];

      const results = await Promise.all(requests.map(req => req.then(r => r.data).catch(() => ({ data: { payload: [] } }))));
      const all = [].concat(...results.map(r => r.data?.payload || r.payload || []));

      const uniqueMap = new Map();
      all.forEach(item => uniqueMap.set(item.id, item));
      const count = uniqueMap.size;

      if (window.ChatwootPluginRegistry && window.ChatwootPluginRegistry.updateConversationListTabCount) {
        window.ChatwootPluginRegistry.updateConversationListTabCount('bot_tab', count);
      } else if (store) {
        store.dispatch('plugins/updateConversationListTabCount', { identifier: 'bot_tab', count });
      }
    } catch (e) {
      // Background poll fail silently
    }
  };

  // Initial fetch
  fetchCount();

  // Listen to Chatwoot's global WebSocket event emitter for real-time reactivity
  // This triggers whenever a conversation status changes, a new message arrives, etc.
  if (window.$chatwootEmitter) {
    window.$chatwootEmitter.on('fetch_conversation_stats', fetchCount);
  } else {
    // Fallback if the emitter isn't exposed
    setInterval(fetchCount, 5000);
  }
};

if (window.ChatwootPluginRegistry) {
  window.ChatwootPluginRegistry.registerConversationListTab(
    'bot_tab', // identifier
    BotTabComponent, // Vue 3 Component
    'icon-robot-line', // Icon (not strictly used by tabs right now but good for API)
    'Bot' // Title
  );

  // Start the background process immediately
  startBotTabPolling();

  console.log("Chatwoot Bot Tab Plugin: Carregado e registrado com sucesso!");
} else {
  console.error("Chatwoot Bot Tab Plugin: O 'window.ChatwootPluginRegistry' não foi encontrado.");
}