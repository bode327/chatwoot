<script setup>
import { reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { useAlert } from 'dashboard/composables';
import { isPhoneE164 } from 'shared/helpers/Validators';
import { useStore, useMapGetter } from 'dashboard/composables/store';

import Input from 'dashboard/components-next/input/Input.vue';
import NextButton from 'dashboard/components-next/button/Button.vue';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection.vue';

const props = defineProps({
  inbox: {
    type: Object,
    default: null,
  },
});

const { t } = useI18n();
const store = useStore();
const router = useRouter();

const isEditing = computed(() => !!props.inbox);

const state = reactive({
  phoneNumber: '',
  domain: '',
  websocketUrl: '',
  username: '',
  password: '',
});

// Populate form if editing
onMounted(() => {
  if (isEditing.value && props.inbox.provider_config) {
    const { provider_config, phone_number } = props.inbox;
    state.phoneNumber = phone_number || '';
    state.domain = provider_config.domain || '';
    state.websocketUrl = provider_config.websocket_url || '';
    state.username = provider_config.username || '';
    state.password = provider_config.password || '';
  }
});

const uiFlags = useMapGetter('inboxes/getUIFlags');

const validationRules = computed(() => {
  const rules = {
    domain: { required },
    username: { required },
    password: { required },
    phoneNumber: { required },
  };
  // If creating, validate phone number format
  if (!isEditing.value) {
    rules.phoneNumber = { required, isPhoneE164 };
  }
  return rules;
});

const v$ = useVuelidate(validationRules, state);

const isSubmitDisabled = computed(() => v$.value.$invalid);

const formErrors = computed(() => ({
  phoneNumber: v$.value.phoneNumber?.$error
    ? t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.ERROR')
    : '',
  domain: v$.value.domain?.$error
    ? t('INBOX_MGMT.ADD.VOICE.SIP.DOMAIN.REQUIRED')
    : '',
  username: v$.value.username?.$error
    ? t('INBOX_MGMT.ADD.VOICE.SIP.USERNAME.REQUIRED')
    : '',
  password: v$.value.password?.$error
    ? t('INBOX_MGMT.ADD.VOICE.SIP.PASSWORD.REQUIRED')
    : '',
}));

const callbackURL = computed(() => {
  const phone =
    state.phoneNumber || (props.inbox ? props.inbox.phone_number : '');
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return `${window.location.origin}/webhooks/sip/${digits}`;
});

function getProviderConfig() {
  return {
    domain: state.domain,
    websocket_url: state.websocketUrl,
    username: state.username,
    password: state.password,
    server: state.domain.startsWith('http')
      ? state.domain
      : `https://${state.domain}`,
  };
}

async function createChannel() {
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

async function updateChannel() {
  try {
    const payload = {
      id: props.inbox.id,
      formData: false,
      channel: {
        provider_config: getProviderConfig(),
      },
    };

    await store.dispatch('inboxes/updateInbox', payload);
    useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
  } catch (error) {
    useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
  }
}

async function handleSubmit() {
  const isFormValid = await v$.value.$validate();
  if (!isFormValid) return;

  if (isEditing.value) {
    await updateChannel();
  } else {
    await createChannel();
  }
}
</script>

<template>
  <form
    class="flex flex-col gap-4 flex-wrap mx-0"
    @submit.prevent="handleSubmit"
  >
    <Input
      v-model="state.phoneNumber"
      :label="t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.LABEL')"
      :placeholder="t('INBOX_MGMT.ADD.VOICE.PHONE_NUMBER.PLACEHOLDER')"
      :message="formErrors.phoneNumber"
      :message-type="formErrors.phoneNumber ? 'error' : 'info'"
      :disabled="isEditing"
      @blur="v$.phoneNumber?.$touch"
    />

    <Input
      v-model="state.domain"
      :label="t('INBOX_MGMT.ADD.VOICE.SIP.DOMAIN.LABEL')"
      :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.DOMAIN.PLACEHOLDER')"
      :message="formErrors.domain"
      :message-type="formErrors.domain ? 'error' : 'info'"
      @blur="v$.domain?.$touch"
    />

    <Input
      v-model="state.websocketUrl"
      :label="t('INBOX_MGMT.ADD.VOICE.SIP.WEBSOCKET_URL.LABEL')"
      :placeholder="t('INBOX_MGMT.ADD.VOICE.SIP.WEBSOCKET_URL.PLACEHOLDER')"
      :message="t('INBOX_MGMT.ADD.VOICE.SIP.WEBSOCKET_URL.HELP')"
      message-type="info"
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

    <SettingsFieldSection
      v-if="isEditing"
      :label="t('INBOX_MGMT.ADD.VOICE.API_CALLBACK.TITLE')"
      :help-text="t('INBOX_MGMT.ADD.VOICE.API_CALLBACK.SUBTITLE')"
    >
      <div
        class="flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-n-alpha-1 border-n-weak text-n-slate-12"
      >
        <span class="truncate">{{ callbackURL }}</span>
      </div>
    </SettingsFieldSection>

    <div
      v-if="!isEditing && state.phoneNumber"
      class="flex flex-col gap-1 mb-4"
    >
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
        :is-loading="isEditing ? uiFlags.isUpdating : uiFlags.isCreating"
        :disabled="isSubmitDisabled"
        :label="
          isEditing
            ? t('INBOX_MGMT.SETTINGS_POPUP.UPDATE')
            : t('INBOX_MGMT.ADD.VOICE.SUBMIT_BUTTON')
        "
        type="submit"
      />
    </div>
  </form>
</template>
