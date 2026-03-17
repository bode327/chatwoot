import GalleryWidget from './components/GalleryWidget.vue';
import GalleryHeaderIcon from './components/GalleryHeaderIcon.vue';

if (window.ChatwootPluginRegistry) {
  window.ChatwootPluginRegistry.registerSidebarWidget(
    'gallery', // identifier
    GalleryWidget, // Vue 3 Component
    'i-lucide-image', // Icon
    'Galeria de Mídias' // Title
  );

  window.ChatwootPluginRegistry.registerConversationHeaderItem(
    'gallery_header_icon', // identifier
    GalleryHeaderIcon, // Vue 3 Component
    'i-lucide-images', // Icon
    'Galeria de Mídias' // Title
  );

  console.log("Chatwoot Gallery Plugin: Carregado e registrado com sucesso!");
} else {
  console.error("Chatwoot Gallery Plugin: O 'window.ChatwootPluginRegistry' não foi encontrado. O plugin não pôde ser instalado na interface.");
}