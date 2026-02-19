<script setup>
import { reactive, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useVuelidate } from '@vuelidate/core';
import { required, requiredIf } from '@vuelidate/validators';
import { useAlert } from 'dashboard/composables';
import { isPhoneE164 } from 'shared/helpers/Validators';
import { useStore, useMapGetter } from 'dashboard/composables/store';

import PageHeader from '../../SettingsSubPageHeader.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';
import ChannelSelector from 'dashboard/components/ChannelSelector.vue';

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const router = useRouter();

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
    icon: 'i-ri-phone-lock-line',
  },
]);

const selectProvider = providerValue => {
  router.push({
    name: route.name,
    params: route.params,
    query: { provider: providerValue },
  });
};

const state = reactive({
  phoneNumber: '',
  accountSid: '',
  authToken: '',
  apiKeySid: '',
  apiKeySecret: '',
  sipServer: '',
  sipUsername: '',
  sipPassword: '',
  sipGatewayUrl: '',
});

const uiFlags = useMapGetter('inboxes/getUIFlags');

const rules = computed(() => ({
  phoneNumber: { required, isPhoneE164 },
  // Twilio Fields
  accountSid: { required: requiredIf(() => selectedProvider.value === PROVIDER_TYPES.TWILIO) },
  authToken: { required: requiredIf(() => selectedProvider.value === PROVIDER_TYPES.TWILIO) },
  apiKeySid: { required: requiredIf(() => selectedProvider.value === PROVIDER_TYPES.TWILIO) },
  apiKeySecret: { required: requiredIf(() => selectedProvider.value === PROVIDER_TYPES.TWILIO) },
  // SIP Fields
  sipServer: { required: requiredIf(() => selectedProvider.value === PROVIDER_TYPES.SIP) },
  sipUsername: { required: requiredIf(() => selectedProvider.value === PROVIDER_TYPES.SIP) },
  sipPassword: { required: requiredIf(() => selectedProvider.value === PROVIDER_TYPES.SIP) },
  sipGatewayUrl: { required: requiredIf(() => selectedProvider.value === PROVIDER_TYPES.SIP) },
}));

const v$ = useVuelidate(rules, state);

const getError = (field) => {
  const fieldObj = v$.value[field];
  if (fieldObj && fieldObj.$error) {
    if (field === 'phoneNumber') return t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.ERROR');

    // SIP Errors
    if (selectedProvider.value === PROVIDER_TYPES.SIP) {
      if (field === 'sipServer') return t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.REQUIRED');
      if (field === 'sipUsername') return t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.REQUIRED');
      if (field === 'sipPassword') return t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.REQUIRED');
      if (field === 'sipGatewayUrl') return t('INBOX_MGMT.ADD.VOICE.SIP.GATEWAY_URL.REQUIRED');
    } else {
      // Twilio Errors
      if (field === 'accountSid') return t('INBOX_MGMT.ADD.VOICE.TWILIO.ACCOUNT_SID.REQUIRED');
      if (field === 'authToken') return t('INBOX_MGMT.ADD.VOICE.TWILIO.AUTH_TOKEN.REQUIRED');
      if (field === 'apiKeySid') return t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SID.REQUIRED');
      if (field === 'apiKeySecret') return t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SECRET.REQUIRED');
    }
  }
  return '';
};

function getProviderConfig() {
  if (selectedProvider.value === PROVIDER_TYPES.SIP) {
    return {
      server: state.sipServer,
      username: state.sipUsername,
      password: state.sipPassword,
      gateway_url: state.sipGatewayUrl,
    };
  }

  return {
    account_sid: state.accountSid,
    auth_token: state.authToken,
    api_key_sid: state.apiKeySid,
    api_key_secret: state.apiKeySecret,
  };
}

async function createChannel() {
  const isFormValid = await v$.value.$validate();
  if (!isFormValid) return;

  try {
    const channel = await store.dispatch('inboxes/createVoiceChannel', {
      name: `Voice (${state.phoneNumber})`,
      voice: {
        phone_number: state.phoneNumber,
        provider: selectedProvider.value,
        provider_config: getProviderConfig(),
      },
    });

    router.replace({
      name: 'settings_inboxes_add_agents',
      params: { page: 'new', inbox_id: channel.id },
    });
  } catch (error) {
    useAlert(
      error.response?.data?.message ||
        t('INBOX_MGMT.ADD.VOICE.API.ERROR_MESSAGE')
    );
  }
}
</script>

<template>
  <div class="overflow-auto col-span-6 p-6 w-full h-full">

    <!-- Provider Selection -->
    <div v-if="showProviderSelection">
      <PageHeader
        :header-title="t('INBOX_MGMT.ADD.VOICE.SELECT_PROVIDER.TITLE')"
        :header-content="t('INBOX_MGMT.ADD.VOICE.SELECT_PROVIDER.DESCRIPTION')"
      />

      <div class="flex gap-6 justify-start">
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

    <!-- Configuration Form -->
    <div v-else-if="showConfiguration">
      <PageHeader
        :header-title="t('INBOX_MGMT.ADD.VOICE.TITLE')"
        :header-content="t('INBOX_MGMT.ADD.VOICE.DESC')"
      />

      <form
        class="flex flex-col gap-4 flex-wrap mx-0"
        @submit.prevent="createChannel"
      >
        <Input
          v-model="state.phoneNumber"
          :label="t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.PLACEHOLDER')"
          :message="getError('phoneNumber')"
          :message-type="getError('phoneNumber') ? 'error' : 'info'"
          @blur="v$.phoneNumber?.$touch"
        />

        <!-- Twilio Fields -->
        <template v-if="selectedProvider === PROVIDER_TYPES.TWILIO">
          <Input
            v-model="state.accountSid"
            :label="t('INBOX_MGMT.ADD.VOICE.TWILIO.ACCOUNT_SID.LABEL')"
            :placeholder="t('INBOX_MGMT.ADD.VOICE.TWILIO.ACCOUNT_SID.PLACEHOLDER')"
            :message="getError('accountSid')"
            :message-type="getError('accountSid') ? 'error' : 'info'"
            @blur="v$.accountSid?.$touch"
          />

          <Input
            v-model="state.authToken"
            type="password"
            :label="t('INBOX_MGMT.ADD.VOICE.TWILIO.AUTH_TOKEN.LABEL')"
            :placeholder="t('INBOX_MGMT.ADD.VOICE.TWILIO.AUTH_TOKEN.PLACEHOLDER')"
            :message="getError('authToken')"
            :message-type="getError('authToken') ? 'error' : 'info'"
            @blur="v$.authToken?.$touch"
          />

          <Input
            v-model="state.apiKeySid"
            :label="t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SID.LABEL')"
            :placeholder="t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SID.PLACEHOLDER')"
            :message="getError('apiKeySid')"
            :message-type="getError('apiKeySid') ? 'error' : 'info'"
            @blur="v$.apiKeySid?.$touch"
          />

          <Input
            v-model="state.apiKeySecret"
            type="password"
            :label="t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SECRET.LABEL')"
            :placeholder="t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SECRET.PLACEHOLDER')"
            :message="getError('apiKeySecret')"
            :message-type="getError('apiKeySecret') ? 'error' : 'info'"
            @blur="v$.apiKeySecret?.$touch"
          />
        </template>

        <!-- SIP Fields -->
        <template v-if="selectedProvider === PROVIDER_TYPES.SIP">
          <Input
            v-model="state.sipServer"
            :label="t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.LABEL')"
            :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.PLACEHOLDER')"
            :message="getError('sipServer')"
            :message-type="getError('sipServer') ? 'error' : 'info'"
            @blur="v$.sipServer?.$touch"
          />

          <Input
            v-model="state.sipUsername"
            :label="t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.LABEL')"
            :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.PLACEHOLDER')"
            :message="getError('sipUsername')"
            :message-type="getError('sipUsername') ? 'error' : 'info'"
            @blur="v$.sipUsername?.$touch"
          />

          <Input
            v-model="state.sipPassword"
            type="password"
            :label="t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.LABEL')"
            :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.PLACEHOLDER')"
            :message="getError('sipPassword')"
            :message-type="getError('sipPassword') ? 'error' : 'info'"
            @blur="v$.sipPassword?.$touch"
          />

          <Input
            v-model="state.sipGatewayUrl"
            :label="t('INBOX_MGMT.ADD.VOICE.SIP.GATEWAY_URL.LABEL')"
            :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.GATEWAY_URL.PLACEHOLDER')"
            :message="getError('sipGatewayUrl')"
            :message-type="getError('sipGatewayUrl') ? 'error' : 'info'"
            @blur="v$.sipGatewayUrl?.$touch"
          />
        </template>

        <div>
          <NextButton
            :is-loading="uiFlags.isCreating"
            :disabled="v$.$invalid"
            :label="t('INBOX_MGMT.ADD.VOICE.SUBMIT_BUTTON')"
            type="submit"
          />
        </div>
      </form>
    </div>
  </div>
</template>
