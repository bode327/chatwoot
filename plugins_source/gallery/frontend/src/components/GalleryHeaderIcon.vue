<template>
  <button
    class="relative p-2 rounded-md hover:bg-n-alpha-2 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer"
    @click="openGallery"
    title="Galeria de Mídias"
  >
    <div class="i-lucide-images text-lg" />
    <span v-if="totalCount > 0" class="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-woot-500 rounded-full">
      {{ totalCount > 99 ? '99+' : totalCount }}
    </span>
  </button>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';

const totalCount = ref(0);

// Evaluate window.$chatwootStore lazily via getter
const currentChat = computed(() => window.$chatwootStore?.getters?.getSelectedChat);

const fetchCount = async () => {
  if (!currentChat.value || !currentChat.value.meta || !currentChat.value.meta.sender) return;
  const contactId = currentChat.value.meta.sender.id;

  const accountId = window.$chatwootStore?.getters?.getCurrentAccountId || 1;

  try {
    const response = await window.axios.get(`/api/v1/accounts/${accountId}/plugins/gallery/media?contact_id=${contactId}`);
    const resData = response.data.data ? response.data.data : response.data;
    const mediaItems = resData.filter(i => i.content_type && !i.content_type.includes('text'));
    totalCount.value = mediaItems.length;
  } catch (error) {
    console.error('Gallery Header Icon: Error fetching count:', error);
  }
};

const openGallery = () => {
  const store = window.$chatwootStore;
  if (!store) return;

  store.dispatch('updateUISettings', {
    uiSettings: {
      ...store.getters.getUISettings,
      is_contact_sidebar_open: true,
      is_plugin_gallery_open: true,
    }
  });
};

watch(() => currentChat.value?.id, fetchCount);

onMounted(() => {
  fetchCount();
});
</script>
