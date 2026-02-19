<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import NextButton from 'dashboard/components-next/button/Button.vue';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { useAlert } from 'dashboard/composables';

const props = defineProps({
  inbox: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();

const webhookUrl = computed(() => {
  // Construct the SIP webhook URL
  // We can use the window.location.origin to build the full URL
  // Pointing to the new SIP controller
  return `${window.location.origin}/sip/voice/incoming_call`;
});

const webhookToken = computed(() => {
  return props.inbox.webhook_token || '';
});

const copy = async (text) => {
  await copyTextToClipboard(text);
  useAlert(t('COMPONENTS.CODE.COPY_SUCCESSFUL'));
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <h3 class="text-base font-medium text-slate-900 dark:text-slate-100">
        {{ t('INBOX_MGMT.ADD.VOICE.SIP.CONFIGURATION.TITLE') }}
      </h3>
      <p class="text-sm text-slate-600 dark:text-slate-400">
        {{ t('INBOX_MGMT.ADD.VOICE.SIP.CONFIGURATION.DESC') }}
      </p>
    </div>

    <div class="flex flex-col gap-4 p-4 border rounded-md border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-slate-600 dark:text-slate-400">
          {{ t('INBOX_MGMT.ADD.VOICE.SIP.CONFIGURATION.WEBHOOK_URL_LABEL') }}
        </label>
        <div class="flex items-center gap-2">
          <input
            :value="webhookUrl"
            readonly
            class="flex-1 px-3 py-2 text-sm bg-white border rounded-md dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          />
          <NextButton
            icon="i-lucide-copy"
            size="sm"
            variant="ghost"
            color="slate"
            @click="copy(webhookUrl)"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-slate-600 dark:text-slate-400">
          {{ t('INBOX_MGMT.ADD.VOICE.SIP.CONFIGURATION.TOKEN_LABEL') }}
        </label>
        <div class="flex items-center gap-2">
          <input
            :value="webhookToken"
            readonly
            class="flex-1 px-3 py-2 text-sm bg-white border rounded-md dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          />
          <NextButton
            icon="i-lucide-copy"
            size="sm"
            variant="ghost"
            color="slate"
            @click="copy(webhookToken)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
