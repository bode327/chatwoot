<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import TwilioVoiceConfiguration from './TwilioVoiceConfiguration.vue';
import SipConfiguration from './SipConfiguration.vue';
import ChannelSelector from 'dashboard/components/ChannelSelector.vue';
import PageHeader from '../../SettingsSubPageHeader.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const PROVIDER_TYPES = {
  TWILIO: 'twilio',
  SIP: 'sip',
};

const selectedProvider = computed(() => route.query.provider);

const showProviderSelection = computed(() => !selectedProvider.value);

const showConfiguration = computed(() => Boolean(selectedProvider.value));

const availableProviders = computed(() => [
  {
    key: PROVIDER_TYPES.TWILIO,
    title: t('INBOX_MGMT.ADD.VOICE.PROVIDERS.TWILIO'),
    description: t('INBOX_MGMT.ADD.VOICE.PROVIDERS.TWILIO_DESC'),
    icon: 'i-woot-twilio',
  },
  {
    key: PROVIDER_TYPES.SIP,
    title: t('INBOX_MGMT.ADD.VOICE.PROVIDERS.SIP'),
    description: t('INBOX_MGMT.ADD.VOICE.PROVIDERS.SIP_DESC'),
    icon: 'i-lucide-phone',
  },
]);

const selectProvider = providerValue => {
  router.push({
    name: route.name,
    params: route.params,
    query: { provider: providerValue },
  });
};

const headerTitle = computed(() => {
  if (selectedProvider.value === PROVIDER_TYPES.SIP) {
    return t('INBOX_MGMT.ADD.VOICE.SIP.TITLE');
  }
  return t('INBOX_MGMT.ADD.VOICE.TITLE');
});

const headerContent = computed(() => {
  if (selectedProvider.value === PROVIDER_TYPES.SIP) {
    return t('INBOX_MGMT.ADD.VOICE.SIP.DESC');
  }
  return t('INBOX_MGMT.ADD.VOICE.DESC');
});
</script>

<template>
  <div class="w-full h-full p-6 col-span-6 overflow-auto">
    <div v-if="showProviderSelection">
      <div class="mb-10 text-left">
        <h1 class="mb-2 text-lg font-medium text-n-slate-12">
          {{ $t('INBOX_MGMT.ADD.VOICE.SELECT_PROVIDER.TITLE') }}
        </h1>
        <p class="text-sm leading-relaxed text-n-slate-11">
          {{ $t('INBOX_MGMT.ADD.VOICE.SELECT_PROVIDER.DESCRIPTION') }}
        </p>
      </div>

      <div class="flex justify-start gap-6">
        <ChannelSelector
          v-for="provider in availableProviders"
          :key="provider.key"
          :title="provider.title"
          :description="provider.description"
          :icon="provider.icon"
          @click="selectProvider(provider.key)"
        />
      </div>
    </div>

    <div v-else-if="showConfiguration">
      <PageHeader
        :header-title="headerTitle"
        :header-content="headerContent"
      />
      <div class="px-6 py-5 border rounded-2xl border-n-weak">
        <TwilioVoiceConfiguration
          v-if="selectedProvider === PROVIDER_TYPES.TWILIO"
        />
        <SipConfiguration
          v-else-if="selectedProvider === PROVIDER_TYPES.SIP"
        />
      </div>
    </div>
  </div>
</template>
