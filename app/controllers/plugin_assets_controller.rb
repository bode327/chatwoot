class PluginAssetsController < ApplicationController
  skip_before_action :verify_authenticity_token, raise: false

  def serve
    plugin_identifier = params[:plugin_identifier]
    # To prevent directory traversal
    path = File.expand_path(params[:path], '/')

    # We serve them from storage/plugins in development/test
    # In a real environment, you'd configure Nginx to alias `/plugins` to `/storage/plugins`
    file_path = Rails.root.join('storage', 'plugins', plugin_identifier, 'frontend', 'dist', path.sub(/\A\//, ''))

    if File.exist?(file_path)
      # Guess mime type based on extension
      mime_type = Rack::Mime.mime_type(File.extname(file_path).to_s)
      send_file file_path, type: mime_type, disposition: 'inline'
    else
      render plain: 'Not Found', status: :not_found
    end
  end
end
