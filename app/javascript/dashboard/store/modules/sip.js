const state = {
  status: 'disconnected', // disconnected, connecting, connected, error
  error: null,
  isLeader: false,
  sessions: [], // Array of call sessions { id, status, remoteIdentity, direction, startTime }
  devices: {
    input: null,
    output: null,
  },
};

const getters = {
  getSIPStatus: $state => $state.status,
  getSIPError: $state => $state.error,
  getSIPSessions: $state => $state.sessions,
  getIsLeader: $state => $state.isLeader,
  getAudioDevices: $state => $state.devices,
};

const actions = {
  updateStatus({ commit }, status) {
    commit('SET_STATUS', status);
  },
  setError({ commit }, error) {
    commit('SET_ERROR', error);
  },
  setLeader({ commit }, isLeader) {
    commit('SET_LEADER', isLeader);
  },
  addSession({ commit }, session) {
    commit('ADD_SESSION', session);
  },
  updateSession({ commit }, { id, updates }) {
    commit('UPDATE_SESSION', { id, updates });
  },
  removeSession({ commit }, sessionId) {
    commit('REMOVE_SESSION', sessionId);
  },
  setAudioDevices({ commit }, devices) {
    commit('SET_AUDIO_DEVICES', devices);
  },
  // The startCall action is removed from here to avoid circular dependency.
  // Components should call SipClient.call() directly, or we inject SipClient.
};

const mutations = {
  SET_STATUS($state, status) {
    $state.status = status;
  },
  SET_ERROR($state, error) {
    $state.error = error;
  },
  SET_LEADER($state, isLeader) {
    $state.isLeader = isLeader;
  },
  ADD_SESSION($state, session) {
    $state.sessions.push(session);
  },
  UPDATE_SESSION($state, { id, updates }) {
    const session = $state.sessions.find(s => s.id === id);
    if (session) {
      Object.assign(session, updates);
    }
  },
  REMOVE_SESSION($state, sessionId) {
    $state.sessions = $state.sessions.filter(s => s.id !== sessionId);
  },
  SET_AUDIO_DEVICES($state, devices) {
    $state.devices = devices;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
