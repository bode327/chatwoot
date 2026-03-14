<template>
  <div class="gallery-widget p-2">
    <button
      class="button button--full w-full flex items-center justify-center gap-2"
      @click="openModal"
    >
      <i class="i-lucide-folder-search"></i> Ver Mídias do Contato
    </button>

    <GalleryModal
      v-if="isModalOpen"
      :contact-id="contactId"
      @close="closeModal"
    />
  </div>
</template>

<script>
import GalleryModal from './GalleryModal.vue';

export default {
  components: {
    GalleryModal
  },
  props: {
    conversationId: {
      type: [Number, String],
      required: true
    },
    contactId: {
      type: [Number, String],
      required: true
    }
  },
  data() {
    return {
      isModalOpen: false
    };
  },
  methods: {
    openModal() {
      this.isModalOpen = true;
    },
    closeModal() {
      this.isModalOpen = false;
    }
  }
}
</script>