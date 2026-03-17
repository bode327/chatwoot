const fs = require('fs');
const file = 'app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue';
let content = fs.readFileSync(file, 'utf8');

const replacement = `onMounted(() => {
  let initialItems = [...conversationSidebarItemsOrder.value];
  const plugins = pluginSidebarWidgets.value;
  plugins.forEach(plugin => {
    const pluginKey = \`plugin_\${plugin.identifier}\`;
    if (!initialItems.find(i => i.name === pluginKey)) {
      initialItems.push({ name: pluginKey });
    }
  });
  conversationSidebarItems.value = initialItems;

  getContactDetails();`;

content = content.replace(`onMounted(() => {
  conversationSidebarItems.value = conversationSidebarItemsOrder.value;
  getContactDetails();`, replacement);

fs.writeFileSync(file, content);
console.log('Done');
