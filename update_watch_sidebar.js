const fs = require('fs');
const file = 'app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue';
let content = fs.readFileSync(file, 'utf8');

const replacement = `watch(pluginSidebarWidgets, (newPlugins) => {
  let items = [...conversationSidebarItems.value];
  let changed = false;
  newPlugins.forEach(plugin => {
    const pluginKey = \`plugin_\${plugin.identifier}\`;
    if (!items.find(i => i.name === pluginKey)) {
      items.push({ name: pluginKey });
      changed = true;
    }
  });
  if (changed) {
    conversationSidebarItems.value = items;
  }
}, { deep: true });

onMounted(() => {`;

content = content.replace(`onMounted(() => {`, replacement);

fs.writeFileSync(file, content);
console.log('Done');
