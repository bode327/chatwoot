<template>
  <div v-if="hasSessions" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
    <div
      v-for="session in sessions"
      :key="session.id"
      class="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      <!-- Header -->
      <div class="px-4 py-3 bg-slate-50 dark:bg-slate-900 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="{
              'bg-green-500': session.status === 'active',
              'bg-yellow-500': session.status === 'connecting' || session.status === 'ringing',
              'bg-red-500': session.status === 'terminated'
            }"
          ></span>
          <span class="font-medium text-sm text-slate-700 dark:text-slate-200">
            {{ session.remoteIdentity }}
          </span>
        </div>
        <span class="text-xs text-slate-500 uppercase">{{ session.status }}</span>
      </div>

      <!-- Content -->
      <div class="p-4 flex flex-col items-center justify-center gap-4">

        <!-- Timer (placeholder) -->
        <div v-if="session.status === 'active'" class="text-2xl font-mono text-slate-800 dark:text-slate-100">
           {{ formatTime(session.startTime) }}
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-4">
          <!-- Incoming Call Actions -->
          <template v-if="session.status === 'ringing' && session.direction === 'inbound'">
            <button
              @click="accept(session.id)"
              class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors"
              title="Answer"
            >
              <span class="i-lucide-phone-call w-5 h-5"></span>
            </button>
            <button
              @click="hangup(session.id)"
              class="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              title="Reject"
            >
              <span class="i-lucide-phone-off w-5 h-5"></span>
            </button>
          </template>

          <!-- Active/Outbound Call Actions -->
          <template v-else>
            <!-- Mute (Placeholder) -->
             <!--
            <button
              class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <span class="i-lucide-mic-off w-5 h-5"></span>
            </button>
            -->

            <button
              @click="hangup(session.id)"
              class="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
              title="End Call"
            >
              <span class="i-lucide-phone-off w-6 h-6"></span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import { sipClient } from 'dashboard/helper/SipClient';

export default {
  data() {
    return {
      timers: {},
      now: Date.now(),
    };
  },
  computed: {
    ...mapGetters({
      sessions: 'sip/getSIPSessions',
    }),
    hasSessions() {
      return this.sessions && this.sessions.length > 0;
    },
  },
  mounted() {
    this.interval = setInterval(() => {
      this.now = Date.now();
    }, 1000);
  },
  beforeUnmount() {
    clearInterval(this.interval);
  },
  methods: {
    accept(id) {
      sipClient.acceptSession(id);
    },
    hangup(id) {
      sipClient.terminateSession(id);
    },
    formatTime(startTime) {
      if (!startTime) return '00:00';
      const diff = Math.floor((this.now - startTime) / 1000);
      if (diff < 0) return '00:00';
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    },
  },
};
</script>
