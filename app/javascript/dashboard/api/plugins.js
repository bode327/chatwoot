import ApiClient from './ApiClient';

class PluginsAPI extends ApiClient {
  constructor() {
    super('plugins', { accountScoped: true });
  }
}

export default new PluginsAPI();
