<script setup>
import { reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { useAlert } from 'dashboard/composables';
import { isPhoneE164 } from 'shared/helpers/Validators';
import { useStore, useMapGetter } from 'dashboard/composables/store';

import PageHeader from '../../SettingsSubPageHeader.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();
const store = useStore();
const router = useRouter();

const state = reactive({
  provider: 'twilio',
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

const validationRules = computed(() => {
  const rules = {
    phoneNumber: { required, isPhoneE164 },
  };

  if (state.provider === 'twilio') {
    rules.accountSid = { required };
    rules.authToken = { required };
    rules.apiKeySid = { required };
    rules.apiKeySecret = { required };
  } else if (state.provider === 'sip') {
    rules.sipServer = { required };
    rules.sipUsername = { required };
    rules.sipPassword = { required };
    rules.sipGatewayUrl = { required };
  }

  return rules;
});

const v$ = useVuelidate(validationRules, state);
const isSubmitDisabled = computed(() => v$.value.$invalid);

const formErrors = computed(() => {
  const errors = {
    phoneNumber: v$.value.phoneNumber?.$error
      ? t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.ERROR')
      : '',
  };

  if (state.provider === 'twilio') {
    errors.accountSid = v$.value.accountSid?.$error
      ? t('INBOX_MGMT.ADD.VOICE.TWILIO.ACCOUNT_SID.REQUIRED')
      : '';
    errors.authToken = v$.value.authToken?.$error
      ? t('INBOX_MGMT.ADD.VOICE.TWILIO.AUTH_TOKEN.REQUIRED')
      : '';
    errors.apiKeySid = v$.value.apiKeySid?.$error
      ? t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SID.REQUIRED')
      : '';
    errors.apiKeySecret = v$.value.apiKeySecret?.$error
      ? t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SECRET.REQUIRED')
      : '';
  } else if (state.provider === 'sip') {
    errors.sipServer = v$.value.sipServer?.$error
      ? t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.REQUIRED')
      : '';
    errors.sipUsername = v$.value.sipUsername?.$error
      ? t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.REQUIRED')
      : '';
    errors.sipPassword = v$.value.sipPassword?.$error
      ? t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.REQUIRED')
      : '';
    errors.sipGatewayUrl = v$.value.sipGatewayUrl?.$error
      ? t('INBOX_MGMT.ADD.VOICE.SIP.GATEWAY_URL.REQUIRED')
      : '';
  }

  return errors;
});

function getProviderConfig() {
  if (state.provider === 'sip') {
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
        provider: state.provider,
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
    <PageHeader
      :header-title="t('INBOX_MGMT.ADD.VOICE.TITLE')"
      :header-content="t('INBOX_MGMT.ADD.VOICE.DESC')"
    />

    <form
      class="flex flex-col gap-4 flex-wrap mx-0"
      @submit.prevent="createChannel"
    >
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-slate-800 dark:text-slate-100">
          {{ t('INBOX_MGMT.ADD.VOICE.PROVIDER.LABEL') }}
        </label>
        <select
          v-model="state.provider"
          class="w-full h-10 px-3 text-sm bg-white border rounded-md outline-none border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-500"
        >
          <option value="twilio">Twilio</option>
          <option value="sip">SIP (Generic)</option>
        </select>
      </div>

      <Input
        v-model="state.phoneNumber"
        :label="t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.LABEL')"
        :placeholder="t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.PLACEHOLDER')"
        :message="formErrors.phoneNumber"
        :message-type="formErrors.phoneNumber ? 'error' : 'info'"
        @blur="v$.phoneNumber?.$touch"
      />

      <!-- Twilio Fields -->
      <template v-if="state.provider === 'twilio'">
        <Input
          v-model="state.accountSid"
          :label="t('INBOX_MGMT.ADD.VOICE.TWILIO.ACCOUNT_SID.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.TWILIO.ACCOUNT_SID.PLACEHOLDER')"
          :message="formErrors.accountSid"
          :message-type="formErrors.accountSid ? 'error' : 'info'"
          @blur="v$.accountSid?.$touch"
        />

        <Input
          v-model="state.authToken"
          type="password"
          :label="t('INBOX_MGMT.ADD.VOICE.TWILIO.AUTH_TOKEN.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.TWILIO.AUTH_TOKEN.PLACEHOLDER')"
          :message="formErrors.authToken"
          :message-type="formErrors.authToken ? 'error' : 'info'"
          @blur="v$.authToken?.$touch"
        />

        <Input
          v-model="state.apiKeySid"
          :label="t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SID.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SID.PLACEHOLDER')"
          :message="formErrors.apiKeySid"
          :message-type="formErrors.apiKeySid ? 'error' : 'info'"
          @blur="v$.apiKeySid?.$touch"
        />

        <Input
          v-model="state.apiKeySecret"
          type="password"
          :label="t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SECRET.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.TWILIO.API_KEY_SECRET.PLACEHOLDER')"
          :message="formErrors.apiKeySecret"
          :message-type="formErrors.apiKeySecret ? 'error' : 'info'"
          @blur="v$.apiKeySecret?.$touch"
        />
      </template>

      <!-- SIP Fields -->
      <template v-if="state.provider === 'sip'">
        <Input
          v-model="state.sipServer"
          :label="t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.PLACEHOLDER')"
          :message="formErrors.sipServer"
          :message-type="formErrors.sipServer ? 'error' : 'info'"
          @blur="v$.sipServer?.$touch"
        />

        <Input
          v-model="state.sipUsername"
          :label="t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.PLACEHOLDER')"
          :message="formErrors.sipUsername"
          :message-type="formErrors.sipUsername ? 'error' : 'info'"
          @blur="v$.sipUsername?.$touch"
        />

        <Input
          v-model="state.sipPassword"
          type="password"
          :label="t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.PLACEHOLDER')"
          :message="formErrors.sipPassword"
          :message-type="formErrors.sipPassword ? 'error' : 'info'"
          @blur="v$.sipPassword?.$touch"
        />

        <Input
          v-model="state.sipGatewayUrl"
          :label="t('INBOX_MGMT.ADD.VOICE.SIP.GATEWAY_URL.LABEL')"
          :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.GATEWAY_URL.PLACEHOLDER')"
          :message="formErrors.sipGatewayUrl"
          :message-type="formErrors.sipGatewayUrl ? 'error' : 'info'"
          @blur="v$.sipGatewayUrl?.$touch"
        />
      </template>

      <div>
        <NextButton
          :is-loading="uiFlags.isCreating"
          :disabled="isSubmitDisabled"
          :label="t('INBOX_MGMT.ADD.VOICE.SUBMIT_BUTTON')"
          type="submit"
        />
      </div>
    </form>
  </div>
</template>
