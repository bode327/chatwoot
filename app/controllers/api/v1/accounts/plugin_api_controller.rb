class Api::V1::Accounts::PluginApiController < Api::V1::Accounts::BaseController
  before_action :check_authorization
  skip_before_action :verify_authenticity_token

  def dispatch_action
    plugin_identifier = params[:plugin_id]
    action_path = params[:action_path]

    plugin = Current.account.plugins.where(active: true, identifier: plugin_identifier).first
    if plugin.nil?
      return render json: { error: 'Plugin not found or not active' }, status: :not_found
    end

    # Translate plugin_id (e.g., 'gallery') and action_path (e.g., 'media')
    # to a specific controller action inside the plugin's namespace
    # Example: "Plugins::GalleryController#media"

    controller_name = "Plugins::#{plugin_identifier.camelize}Controller"

    begin
      controller_class = controller_name.constantize
    rescue NameError
      return render json: { error: "Plugin controller #{controller_name} not found. Ensure the plugin zip contains a backend/controllers/#{plugin_identifier}_controller.rb file defining it." }, status: :not_implemented
    end

    # We must instantiate the controller and manually dispatch the action
    # This is a bit advanced but allows plugins to "own" their sub-routes without dirtying config/routes.rb
    # The action_path can contain slashes, so we translate the first part to the action, or default to :index

    segments = action_path.to_s.split('/')
    action_name = segments.first || 'index'

    unless controller_class.action_methods.include?(action_name)
      return render json: { error: "Action '#{action_name}' not found on #{controller_name}" }, status: :not_found
    end

    # Update params to pass to the plugin controller
    request.params[:plugin_action_segments] = segments[1..-1] || []

    # Dispatch! We instantiate the plugin's controller manually and process the action.
    # We use ActionDispatch to dispatch exactly as Rails router does
    controller_class.dispatch(action_name, request, response)
  end

  private

  def check_authorization
    # Standard Chatwoot API authorization checks
    authorize(Current.account, :show?)
  end
end
