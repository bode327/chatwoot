import { markRaw } from 'vue';
import pluginsAPI from '../../api/plugins';

const state = {
  records: [],
  uiElements: {
    sidebarWidgets: [],
    mainTabs: [],
    conversationHeaderItems: [],
    conversationListTabs: [],
    messageBubbleActions: [],
    inboxSettingsMenuItems: [],
  },
};

const getters = {
  getPlugins: $state => $state.records,
  getSidebarWidgets: $state => $state.uiElements.sidebarWidgets,
  getMainTabs: $state => $state.uiElements.mainTabs,
  getConversationHeaderItems: $state => $state.uiElements.conversationHeaderItems,
  getConversationListTabs: $state => $state.uiElements.conversationListTabs,
  getMessageBubbleActions: $state => $state.uiElements.messageBubbleActions,
  getInboxSettingsMenuItems: $state => $state.uiElements.inboxSettingsMenuItems,
};

const actions = {
  get: async ({ commit }) => {
    try {
      const response = await pluginsAPI.get();
      commit('SET_PLUGINS', response.data);
      // Logic to actually load the scripts into the DOM
      response.data.forEach(plugin => {
        const scriptId = `plugin-${plugin.identifier}`;
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          // In Vite library mode (IIFE), we shouldn't use type="module" if not exporting ES module.
          // We will fallback to standard text/javascript
          script.type = 'text/javascript';
          script.src = `/plugins/${plugin.identifier}/frontend/dist/plugin.js`;
          document.body.appendChild(script);

          // Note: we removed the aggressive <link href="style.css"> injection here.
          // Since not all plugins have CSS (like the gallery plugin you uploaded),
          // requesting a missing file results in a 404 text/plain response that browser complains about.
          // Plugin devs should import CSS directly within their Vite plugin.js build via
          // standard CSS injection tools if they have styles, or we can add a flag to plugin.json later.
        }
      });
    } catch (error) {
      console.error('Failed to fetch or evaluate dynamic plugins:', error);
    }
  },
  registerSidebarWidget({ commit }, payload) {
    commit('ADD_SIDEBAR_WIDGET', payload);
  },
  registerMainTab({ commit }, payload) {
    commit('ADD_MAIN_TAB', payload);
  },
  registerConversationHeaderItem({ commit }, payload) {
    commit('ADD_CONVERSATION_HEADER_ITEM', payload);
  },
  registerConversationListTab({ commit }, payload) {
    commit('ADD_CONVERSATION_LIST_TAB', payload);
  },
  registerMessageBubbleAction({ commit }, payload) {
    commit('ADD_MESSAGE_BUBBLE_ACTION', payload);
  },
  registerInboxSettingsMenuItem({ commit }, payload) {
    commit('ADD_INBOX_SETTINGS_MENU_ITEM', payload);
  },
};

const mutations = {
  SET_PLUGINS($state, data) {
    $state.records = data;
  },
  ADD_SIDEBAR_WIDGET($state, widget) {
    const exists = $state.uiElements.sidebarWidgets.find(w => w.identifier === widget.identifier);
    if (!exists) {
      $state.uiElements.sidebarWidgets.push({ ...widget, component: markRaw(widget.component) });
    }
  },
  ADD_MAIN_TAB($state, tab) {
    const exists = $state.uiElements.mainTabs.find(t => t.identifier === tab.identifier);
    if (!exists) {
      $state.uiElements.mainTabs.push({ ...tab, component: markRaw(tab.component) });
    }
  },
  ADD_CONVERSATION_HEADER_ITEM($state, item) {
    const exists = $state.uiElements.conversationHeaderItems.find(i => i.identifier === item.identifier);
    if (!exists) {
      $state.uiElements.conversationHeaderItems.push({ ...item, component: markRaw(item.component) });
    }
  },
  ADD_CONVERSATION_LIST_TAB($state, item) {
    const exists = $state.uiElements.conversationListTabs.find(i => i.identifier === item.identifier);
    if (!exists) {
      $state.uiElements.conversationListTabs.push({ ...item, component: markRaw(item.component) });
    }
  },
  ADD_MESSAGE_BUBBLE_ACTION($state, item) {
    const exists = $state.uiElements.messageBubbleActions.find(i => i.identifier === item.identifier);
    if (!exists) {
      $state.uiElements.messageBubbleActions.push({ ...item, component: item.component ? markRaw(item.component) : null });
    }
  },
  ADD_INBOX_SETTINGS_MENU_ITEM($state, item) {
    const exists = $state.uiElements.inboxSettingsMenuItems.find(i => i.identifier === item.identifier);
    if (!exists) {
      $state.uiElements.inboxSettingsMenuItems.push({ ...item, component: markRaw(item.component) });
    }
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
