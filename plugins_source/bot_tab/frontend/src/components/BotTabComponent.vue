<template>
  <div class="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-slate-900 h-full">
    <div v-if="loading" class="flex justify-center p-4">Carregando conversas do bot...</div>
    <div v-else-if="conversations.length === 0" class="p-4 text-center text-slate-400 text-sm mt-4">
      Nenhum chamado pendente no Bot.
    </div>
    <div v-else class="conversations-list">
      <a
        v-for="conv in conversations"
        :key="conv.id"
        :href="`/app/accounts/${accountId}/conversations/${conv.id}`"
        @click.prevent="openConversation(conv.id)"
        class="block w-full cursor-pointer border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-100 font-bold flex-shrink-0">
            <img v-if="conv.meta?.sender?.thumbnail" :src="conv.meta.sender.thumbnail" class="w-full h-full rounded-full object-cover">
            <span v-else>{{ (conv.meta?.sender?.name || '?')[0].toUpperCase() }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-baseline mb-1">
              <span class="font-medium text-sm text-slate-800 dark:text-slate-100 truncate pr-2">{{ conv.meta?.sender?.name || 'Visitante' }}</span>
              <span class="text-[10px] text-slate-400 whitespace-nowrap">{{ formatTime(conv.last_activity_at) }}</span>
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 truncate">
              {{ conv.messages?.[0]?.content || '📎 Anexo ou mensagem vazia' }}
            </div>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';

const store = window.$chatwootStore;
// Aggressive account ID parsing to prevent 404s if store is not populated yet
const accountId = computed(() => {
  if (store?.getters?.getCurrentAccountId) return store.getters.getCurrentAccountId;
  const urlMatch = window.location.pathname.match(/\/accounts\/(\d+)\//);
  if (urlMatch) return urlMatch[1];
  return 1;
});
const conversations = ref([]);
const loading = ref(true);
let intervalId = null;

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const openConversation = (convId) => {
  if (window.$chatwootRouter) {
    // Chatwoot's typical vue-router uses name and params for deep linking without full reload.
    // Ensure we trigger a router push correctly.
    window.$chatwootRouter.push({
      name: 'inbox_conversation',
      params: { accountId: accountId.value, inbox_id: 0, conversation_id: convId }
    }).catch(err => {
      // If inbox_conversation fails (e.g., depends on parent routes), try falling back to standard string.
      window.$chatwootRouter.push(`/app/accounts/${accountId.value}/conversations/${convId}`);
    });
  } else {
    window.location.href = `/app/accounts/${accountId.value}/conversations/${convId}`;
  }
};

const fetchBotData = async () => {
  try {
    // We must use the exact Chatwoot endpoint structure (avoiding pure string concatenation which might be intercepted or missing trailing slashes).
    // The safest way is to use params so Axios serializes them correctly, bypassing URL matching bugs in 404 routers.
    const requests = [
      window.axios.get(`/api/v1/accounts/${accountId.value}/conversations`, { params: { status: 'pending', sort_by: 'last_activity_at' } }),
      window.axios.get(`/api/v1/accounts/${accountId.value}/conversations`, { params: { status: 'snoozed', sort_by: 'last_activity_at' } })
    ];

    const results = await Promise.all(requests.map(req => req.then(r => r.data).catch((e) => {
      console.warn("Bot Tab Fetch Failed:", e.message);
      return { data: { payload: [] } };
    })));

    // Extract payload carefully considering data shapes
    const all = [].concat(...results.map(r => r.data?.payload || r.payload || []));

    // Remove duplicates
    const uniqueMap = new Map();
    all.forEach(item => uniqueMap.set(item.id, item));
    const unique = Array.from(uniqueMap.values());

    // Sort
    conversations.value = unique.sort((a, b) => b.last_activity_at - a.last_activity_at);

    // Update the custom tab count dynamically
    if (window.ChatwootPluginRegistry && window.ChatwootPluginRegistry.updateConversationListTabCount) {
      window.ChatwootPluginRegistry.updateConversationListTabCount('bot_tab', conversations.value.length);
    } else if (store) {
      store.dispatch('plugins/updateConversationListTabCount', { identifier: 'bot_tab', count: conversations.value.length });
    }
  } catch (e) {
    console.error('Bot tab error:', e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchBotData();

  // Keep the interval as a fallback backup
  intervalId = setInterval(fetchBotData, 10000);

  if (window.$chatwootEmitter) {
    window.$chatwootEmitter.on('fetch_conversation_stats', fetchBotData);
  }
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
  if (window.$chatwootEmitter) {
    window.$chatwootEmitter.off('fetch_conversation_stats', fetchBotData);
  }
});
</script>