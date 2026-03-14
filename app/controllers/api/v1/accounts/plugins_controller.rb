class Api::V1::Accounts::PluginsController < Api::V1::Accounts::BaseController
  before_action :check_authorization

  def index
    # Fetch plugins assigned to this account and currently active globally
    @plugins = Current.account.plugins.where(active: true)
  end

  private

  def check_authorization
    authorize(Current.account, :show?)
  end
end
