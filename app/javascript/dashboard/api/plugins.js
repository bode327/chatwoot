import ApiClient from '../../api/ApiClient';

class PluginsAPI extends ApiClient {
  constructor() {
    super('plugins', { accountScoped: true });
  }
}

export default new PluginsAPI();
