<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
    <div class="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col overflow-hidden relative">

      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 border-b border-n-weak shrink-0">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-n-slate-12">Mídias do Contato</h2>
          <span class="text-sm text-n-slate-10">(Sincronizado via API ✓ | {{ mediaList.length }} arquivos)</span>
        </div>

        <div class="flex items-center gap-2">
          <button @click="fetchMedia(false)" class="button button--clear flex items-center gap-2">
            <i class="i-lucide-refresh-cw"></i> Atualizar
          </button>
          <button @click="$emit('close')" class="p-2 hover:bg-n-weak rounded-md text-n-slate-11">
            <i class="i-lucide-x text-xl"></i>
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex items-center gap-3 p-4 border-b border-n-weak bg-n-alpha-1 shrink-0 overflow-x-auto">
        <button
          v-for="filter in filters"
          :key="filter.id"
          @click="activeFilter = filter.id"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
          :class="activeFilter === filter.id ? 'bg-blue-500 text-white shadow-sm' : 'bg-white border border-n-weak text-n-slate-11 hover:bg-n-weak'"
        >
          {{ filter.label }}
          <span class="bg-white/20 px-1.5 rounded text-xs">{{ countFor(filter.id) }}</span>
        </button>
      </div>

      <!-- Media Content Grid -->
      <div class="flex-1 overflow-y-auto p-4 bg-n-alpha-1">
        <div v-if="loading" class="flex h-full items-center justify-center text-n-slate-10">
          <i class="i-lucide-loader-2 animate-spin text-3xl"></i>
        </div>

        <div v-else-if="filteredMedia.length === 0" class="flex h-full items-center justify-center text-n-slate-10">
          Nenhuma mídia encontrada.
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="item in filteredMedia"
            :key="item.id"
            class="bg-white border border-n-weak rounded-lg shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md"
          >
            <!-- Media Viewer Area -->
            <div class="h-40 bg-n-alpha-2 flex items-center justify-center relative overflow-hidden group">

              <template v-if="item.file_type === 'image'">
                <img :src="item.url" class="object-cover w-full h-full cursor-pointer hover:scale-105 transition-transform" @click="openLink(item.url)" />
              </template>

              <template v-else-if="item.file_type === 'video'">
                <video :src="item.url" class="w-full h-full object-cover" controls preload="metadata"></video>
              </template>

              <template v-else-if="item.file_type === 'audio'">
                <div class="flex flex-col items-center justify-center w-full h-full gap-3 p-4 bg-gray-50">
                  <i class="i-lucide-music text-3xl text-n-slate-9"></i>
                  <audio :src="item.url" controls class="w-full h-10"></audio>
                </div>
              </template>

              <template v-else-if="item.file_type === 'link'">
                <!-- Links -->
                <div class="flex flex-col items-center justify-center w-full h-full gap-2 text-blue-500 cursor-pointer hover:bg-n-weak transition-colors" @click="openLink(item.url)">
                  <i class="i-lucide-link text-4xl"></i>
                  <span class="text-xs font-medium px-4 text-center break-words line-clamp-2">{{ item.url }}</span>
                </div>
              </template>

              <template v-else>
                <!-- Documents / Files -->
                <div class="flex flex-col items-center justify-center w-full h-full gap-2 text-n-slate-11 cursor-pointer hover:bg-n-weak transition-colors" @click="openLink(item.url)">
                  <i class="i-lucide-file-text text-4xl"></i>
                  <span class="text-xs font-medium px-4 text-center break-words line-clamp-2">Visualizar Arquivo</span>
                </div>
              </template>
            </div>

            <!-- Metadata Footer -->
            <div class="p-3 bg-white border-t border-n-weak flex items-center justify-between text-xs text-n-slate-10">
              <div class="flex flex-col">
                <span class="font-medium text-n-slate-12">{{ formatDate(item.created_at) }}</span>
                <span>{{ formatTime(item.created_at) }}</span>
              </div>
              <a :href="item.url" target="_blank" class="text-blue-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors">
                Ir <i class="i-lucide-external-link"></i>
              </a>
            </div>
          </div>
        </div>

        <div v-if="hasMore && !loading" class="flex justify-center mt-6 mb-2">
          <button @click="loadMore" class="px-6 py-2 bg-n-weak border border-n-slate-4 rounded-md text-n-slate-11 hover:bg-n-alpha-2 transition-colors">
            Carregar mais mídias
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    contactId: {
      type: [Number, String],
      required: true
    }
  },
  data() {
    return {
      mediaList: [],
      loading: true,
      activeFilter: 'all',
      currentPage: 1,
      hasMore: true,
      filters: [
        { id: 'all', label: 'Todos' },
        { id: 'image', label: 'Fotos' },
        { id: 'video', label: 'Vídeos' },
        { id: 'audio', label: 'Áudios' },
        { id: 'file', label: 'Documentos' },
        { id: 'link', label: 'Links' }
      ]
    };
  },
  computed: {
    filteredMedia() {
      if (this.activeFilter === 'all') return this.mediaList;
      return this.mediaList.filter(item => item.file_type === this.activeFilter);
    }
  },
  async mounted() {
    this.fetchMedia();

    // Close on escape
    this.handleEscape = (e) => {
      if (e.key === 'Escape') this.$emit('close');
    };
    window.addEventListener('keydown', this.handleEscape);
  },
  unmounted() {
    if (this.handleEscape) {
      window.removeEventListener('keydown', this.handleEscape);
    }
  },
  methods: {
    async fetchMedia(isLoadMore = false) {
      if (!isLoadMore) {
        this.loading = true;
        this.currentPage = 1;
        this.mediaList = [];
        this.hasMore = true;
      } else {
        this.loading = true;
      }

      try {
        // URL Pathname logic fix.
        // If window.location.pathname is '/app/accounts/1/conversations/...', split('/')[3] is '1'
        const pathSegments = window.location.pathname.split('/');
        const fallbackAccountId = pathSegments.includes('accounts') ? pathSegments[pathSegments.indexOf('accounts') + 1] : '1';
        const accountId = window.chatwootConfig?.accountId || fallbackAccountId;

        // Use Chatwoot's globally configured axios instance so session tokens are automatically attached
        // Fallback to fetch if window.axios is not available (though it always is in chatwoot)
        const axiosInstance = window.axios || window.ChatwootAxios;
        const response = await axiosInstance.get(`/api/v1/accounts/${accountId}/plugins/gallery/media`, {
          params: {
            contact_id: this.contactId,
            page: this.currentPage
          }
        });

        // Chatwoot sometimes returns JSON directly, or sometimes nested in data.payload or data.data.
        // Let's handle all possibilities, considering we render `render json: results` in the backend directly.
        const responseData = response.data;

        let newItems = [];
        if (Array.isArray(responseData)) {
          newItems = responseData;
        } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
          newItems = responseData.data;
        } else if (responseData && responseData.payload && Array.isArray(responseData.payload)) {
          newItems = responseData.payload;
        }

        if (isLoadMore) {
          this.mediaList = [...this.mediaList, ...newItems];
        } else {
          this.mediaList = newItems;
        }

        if (newItems.length < 100) {
          this.hasMore = false;
        }
      } catch (err) {
        console.error("Gallery Plugin: falha ao carregar mídias do contato", err);
      } finally {
        this.loading = false;
      }
    },
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.currentPage += 1;
        this.fetchMedia(true);
      }
    },
    countFor(filterId) {
      if (filterId === 'all') return this.mediaList.length;
      return this.mediaList.filter(item => item.file_type === filterId).length;
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { year: '2-digit', month: '2-digit', day: '2-digit' });
    },
    formatTime(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },
    openLink(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
</script>