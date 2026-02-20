/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import { UserAgent, Registerer, Inviter, SessionState } from 'sip.js';

class SipClient {
  constructor() {
    this.userAgent = null;
    this.registerer = null;
    this.store = null;
    this.inbox = null;
    this.channel = new BroadcastChannel('chatwoot_sip_leader');
    this.myId = Math.random().toString(36).substr(2, 9);
    this.leaderId = null;
    this.isLeader = false;
    this.checkLeaderInterval = null;
    this.lastLeaderHeartbeat = 0;
    this.sessions = {}; // local map of sessions

    this.channel.onmessage = event => this.handleChannelMessage(event);

    // Start election check loop
    this.checkLeaderInterval = setInterval(() => this.checkLeader(), 1500);
  }

  setStore(store) {
    this.store = store;
  }

  configure(inbox) {
    this.inbox = inbox;
    // If we are already leader, reconnect with new config?
    if (this.isLeader) {
      this.connect();
    }
  }

  // --- Leader Election ---

  checkLeader() {
    const now = Date.now();
    if (this.isLeader) {
      // I am leader, send heartbeat
      this.channel.postMessage({ type: 'HEARTBEAT', id: this.myId });
    } else if (now - this.lastLeaderHeartbeat > 4000) {
      // Leader dead, take over
      this.becomeLeader();
    }
  }

  handleChannelMessage(event) {
    const { type, id } = event.data;
    if (type === 'HEARTBEAT') {
      this.lastLeaderHeartbeat = Date.now();
      if (this.isLeader && id !== this.myId) {
        // Conflict: Another tab thinks it is leader.
        // If their ID > mine, yield? Or just yield to avoid storm.
        // Simpler: If I see another heartbeat, I yield.
        this.yieldLeadership();
      } else if (!this.isLeader) {
        this.leaderId = id;
      }
    } else if (type === 'FORCE_LEADER') {
      if (this.isLeader && id !== this.myId) {
        this.yieldLeadership();
      }
    }
  }

  becomeLeader() {
    console.log('SIP: Becoming Leader', this.myId);
    this.isLeader = true;
    this.leaderId = this.myId;
    this.store?.dispatch('sip/setLeader', true);
    this.channel.postMessage({ type: 'HEARTBEAT', id: this.myId });

    if (this.inbox && this.inbox.provider_config) {
      this.connect();
    }
  }

  yieldLeadership() {
    console.log('SIP: Yielding Leadership', this.myId);
    this.isLeader = false;
    this.store?.dispatch('sip/setLeader', false);
    this.disconnect(false); // Disconnect but don't clear config
  }

  forceLeadership() {
    this.channel.postMessage({ type: 'FORCE_LEADER', id: this.myId });
    this.becomeLeader();
  }

  // --- SIP Connection ---

  async connect() {
    if (!this.inbox || !this.inbox.provider_config) {
      // Don't warn if we just haven't been configured yet (common on load)
      if (this.inbox) {
        console.warn('SIP: Configuration incomplete', this.inbox);
      }
      return;
    }

    // Prevent duplicate connection
    if (this.userAgent && this.userAgent.isConnected()) return;

    const { server, username, password } = this.inbox.provider_config;
    // Note: 'gateway_url' maps to WSS URL in SipConfiguration.vue?
    // Wait, SipConfiguration.vue saved 'websocket_url' (via updated component, not pushed to DB yet? No, DB stores JSON).
    // The previous plan updated SipConfiguration.vue to use `websocket_url` key in JSON.
    // Let's check keys in provider_config.
    const wssUrl =
      this.inbox.provider_config.websocket_url ||
      this.inbox.provider_config.gateway_url;
    const domain = this.inbox.provider_config.domain || server;

    if (!wssUrl || !domain) {
      this.store?.dispatch('sip/setError', 'Missing WSS URL or Domain');
      return;
    }

    const uri = UserAgent.makeURI(`sip:${username}@${domain}`);
    const transportOptions = {
      server: wssUrl,
      traceSip: true,
    };

    this.store?.dispatch('sip/updateStatus', 'connecting');

    try {
      this.userAgent = new UserAgent({
        uri,
        transportOptions,
        authorizationUsername: username,
        authorizationPassword: password,
        delegate: {
          onConnect: () => {
            this.store?.dispatch('sip/updateStatus', 'connected');
            this.register();
          },
          onDisconnect: error => {
            this.store?.dispatch('sip/updateStatus', 'disconnected');
            if (error) {
              this.store?.dispatch('sip/setError', error.message);
            }
          },
          onInvite: invitation => {
            this.handleIncomingCall(invitation);
          },
        },
      });

      await this.userAgent.start();
    } catch (error) {
      console.error('SIP: Failed to start UserAgent', error);
      this.store?.dispatch('sip/updateStatus', 'error');
      this.store?.dispatch('sip/setError', error.message);
    }
  }

  async register() {
    if (!this.userAgent) return;
    try {
      this.registerer = new Registerer(this.userAgent);
      await this.registerer.register();
    } catch (e) {
      console.error('SIP: Registration failed', e);
    }
  }

  async disconnect(full = true) {
    if (this.registerer) {
      try {
        await this.registerer.unregister();
      } catch (e) {
        // ignore
      }
      this.registerer = null;
    }
    if (this.userAgent) {
      try {
        await this.userAgent.stop();
      } catch (e) {
        // ignore
      }
      this.userAgent = null;
    }
    this.store?.dispatch('sip/updateStatus', 'disconnected');
    if (full) {
      this.inbox = null;
    }
  }

  // --- Call Handling ---

  async call(phoneNumber, inbox, contactId) {
    if (inbox) {
      this.configure(inbox);
    }

    // Ensure we are leader (take over if needed)
    if (!this.isLeader) {
      this.forceLeadership();
      // Wait a moment for connection?
      // UserAgent.start() is async.
      // We need to wait until connected.
      await new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
    }

    if (!this.userAgent || !this.userAgent.isConnected()) {
      await this.connect();
    }

    if (!this.userAgent) {
      throw new Error(
        'SIP Client failed to initialize. Please check configuration.'
      );
    }

    const target = UserAgent.makeURI(
      `sip:${phoneNumber}@${this.inbox.provider_config.domain}`
    );
    if (!target) {
      throw new Error('Invalid Target URI');
    }

    const inviter = new Inviter(this.userAgent, target, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });

    this.setupSession(inviter, phoneNumber, 'outbound');

    await inviter.invite();

    // Create conversation in Chatwoot
    this.createConversation(inbox.id, contactId);

    return inviter;
  }

  async createConversation(inboxId, contactId) {
    if (!this.store || !inboxId || !contactId) return;

    try {
      // We need accountId. Usually available in store or user object.
      // But axios in Chatwoot is pre-configured with baseURL?
      // ApiClient uses 'accounts' scoped.
      // Let's use direct axios call with relative path if we know the account.
      // Or use the store's current account ID.
      const accountId = this.store.getters['getCurrentAccountId'];
      if (!accountId) return;

      await window.axios.post(
        `/api/v1/accounts/${accountId}/conversations`,
        {
          inbox_id: inboxId,
          contact_id: contactId,
          status: 'open',
          additional_attributes: { type: 'voice_call' },
        }
      );

      // Navigate to conversation?
      // window.location = ... (No, SPA navigation)
      // We can use router if available, or just let the user stay.
      // But creating it ensures it is logged.

      // Optionally add a system message or note?
    } catch (error) {
      console.error('SIP: Failed to create conversation', error);
    }
  }

  handleIncomingCall(invitation) {
    // Auto-answer or show UI?
    // Show UI.
    const remoteIdentity = invitation.remoteIdentity.uri.user;
    this.setupSession(invitation, remoteIdentity, 'inbound');
  }

  setupSession(session, remoteIdentity, direction) {
    const id = session.id;
    this.sessions[id] = session;

    const sessionData = {
      id,
      direction,
      remoteIdentity,
      status: 'ringing',
      startTime: null,
    };

    this.store?.dispatch('sip/addSession', sessionData);

    session.stateChange.addListener(newState => {
      let status = 'active';
      switch (newState) {
        case SessionState.Establishing:
          status = 'connecting';
          break;
        case SessionState.Established:
          status = 'active';
          this.store?.dispatch('sip/updateSession', {
            id,
            updates: { startTime: Date.now() },
          });
          break;
        case SessionState.Terminated:
          status = 'terminated';
          this.store?.dispatch('sip/removeSession', id);
          delete this.sessions[id];
          break;
        default:
          break;
      }
      this.store?.dispatch('sip/updateSession', { id, updates: { status } });
    });
  }

  // --- Session Control ---

  acceptSession(sessionId) {
    const session = this.sessions[sessionId];
    if (session && session.accept) {
      session.accept();
    }
  }

  terminateSession(sessionId) {
    const session = this.sessions[sessionId];
    if (session) {
      switch (session.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (session instanceof Inviter) {
            session.cancel();
          } else {
            session.reject();
          }
          break;
        case SessionState.Established:
          session.bye();
          break;
        default:
          break;
      }
    }
  }

  muteSession(sessionId) {
    // TODO: Implement Mute
  }
}

export const sipClient = new SipClient();
