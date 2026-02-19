<script setup>
import { reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { useAlert } from 'dashboard/composables';
import { isPhoneE164 } from 'shared/helpers/Validators';
import { useStore, useMapGetter } from 'dashboard/composables/store';

import Input from 'dashboard/components-next/input/Input.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';

const { t } = useI18n();
const store = useStore();
const router = useRouter();

const state = reactive({
  phoneNumber: '',
  server: '',
  username: '',
  password: '',
});

const uiFlags = useMapGetter('inboxes/getUIFlags');

const validationRules = {
  phoneNumber: { required, isPhoneE164 },
  server: { required },
  username: { required },
  password: { required },
};

const v$ = useVuelidate(validationRules, state);
const isSubmitDisabled = computed(() => v$.value.$invalid);

const formErrors = computed(() => ({
  phoneNumber: v$.value.phoneNumber?.$error
    ? t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.ERROR')
    : '',
  server: v$.value.server?.$error
    ? t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.REQUIRED')
    : '',
  username: v$.value.username?.$error
    ? t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.REQUIRED')
    : '',
  password: v$.value.password?.$error
    ? t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.REQUIRED')
    : '',
}));

const callbackURL = computed(() => {
  if (!state.phoneNumber) return '';
  const digits = state.phoneNumber.replace(/\D/g, '');
  return `${window.location.origin}/webhooks/sip/${digits}`;
});

function getProviderConfig() {
  const config = {
    server: state.server,
    username: state.username,
    password: state.password,
  };
  return config;
}

async function createChannel() {
  const isFormValid = await v$.value.$validate();
  if (!isFormValid) return;

  try {
    const channel = await store.dispatch('inboxes/createVoiceChannel', {
      name: `Voice (${state.phoneNumber})`,
      voice: {
        phone_number: state.phoneNumber,
        provider: 'sip',
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
  <form
    class="flex flex-col gap-4 flex-wrap mx-0"
    @submit.prevent="createChannel"
  >
    <Input
      v-model="state.phoneNumber"
      :label="t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.LABEL')"
      :placeholder="t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.PLACEHOLDER')"
      :message="formErrors.phoneNumber"
      :message-type="formErrors.phoneNumber ? 'error' : 'info'"
      @blur="v$.phoneNumber?.$touch"
    />

    <Input
      v-model="state.server"
      :label="t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.LABEL')"
      :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.SERVER.PLACEHOLDER')"
      :message="formErrors.server"
      :message-type="formErrors.server ? 'error' : 'info'"
      @blur="v$.server?.$touch"
    />

    <Input
      v-model="state.username"
      :label="t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.LABEL')"
      :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.PLACEHOLDER')"
      :message="formErrors.username"
      :message-type="formErrors.username ? 'error' : 'info'"
      @blur="v$.username?.$touch"
    />

    <Input
      v-model="state.password"
      type="password"
      :label="t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.LABEL')"
      :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.PLACEHOLDER')"
      :message="formErrors.password"
      :message-type="formErrors.password ? 'error' : 'info'"
      @blur="v$.password?.$touch"
    />

    <div v-if="state.phoneNumber" class="flex flex-col gap-1 mb-4">
      <label class="text-xs font-semibold text-n-slate-12">
        {{ t('INBOX_MGMT.ADD.VOICE.API_CALLBACK.TITLE') }}
      </label>
      <p class="mb-1 text-xs text-n-slate-11">
        {{ t('INBOX_MGMT.ADD.VOICE.API_CALLBACK.SUBTITLE') }}
      </p>
      <div
        class="flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-n-alpha-1 border-n-weak text-n-slate-12"
      >
        <span class="truncate">{{ callbackURL }}</span>
      </div>
    </div>

    <div>
      <NextButton
        :is-loading="uiFlags.isCreating"
        :disabled="isSubmitDisabled"
        :label="t('INBOX_MGMT.ADD.VOICE.SUBMIT_BUTTON')"
        type="submit"
      />
    </div>
  </form>
</template>
