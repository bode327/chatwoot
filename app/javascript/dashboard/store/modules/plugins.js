import pluginsAPI from '../../api/plugins';

const state = {
  records: [],
  uiElements: {
    sidebarWidgets: [],
    mainTabs: [],
  },
};

const getters = {
  getPlugins: $state => $state.records,
  getSidebarWidgets: $state => $state.uiElements.sidebarWidgets,
  getMainTabs: $state => $state.uiElements.mainTabs,
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

          // Optionally load CSS if exists
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = `/plugins/${plugin.identifier}/frontend/dist/style.css`;
          document.head.appendChild(link);
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
};

const mutations = {
  SET_PLUGINS($state, data) {
    $state.records = data;
  },
  ADD_SIDEBAR_WIDGET($state, widget) {
    const exists = $state.uiElements.sidebarWidgets.find(w => w.identifier === widget.identifier);
    if (!exists) {
      $state.uiElements.sidebarWidgets.push(widget);
    }
  },
  ADD_MAIN_TAB($state, tab) {
    const exists = $state.uiElements.mainTabs.find(t => t.identifier === tab.identifier);
    if (!exists) {
      $state.uiElements.mainTabs.push(tab);
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
