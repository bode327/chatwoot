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
      # Guess mime type based on extension manually if Rack::Mime fails
      ext = File.extname(file_path).to_s.downcase
      mime_type = case ext
                  when '.css' then 'text/css'
                  when '.js' then 'application/javascript'
                  when '.html' then 'text/html'
                  when '.json' then 'application/json'
                  when '.png' then 'image/png'
                  when '.jpg', '.jpeg' then 'image/jpeg'
                  when '.svg' then 'image/svg+xml'
                  else Rack::Mime.mime_type(ext, 'text/plain')
                  end

      # Use send_data with disposition inline.
      # By calling send_data, ActionController::DataStreaming is used,
      # which properly formats the Rack response array and prevents
      # ActionDispatch and Rack::Lint from overriding 'Content-Type'
      # headers for string responses (like `render plain`).
      send_data File.read(file_path), type: mime_type, disposition: 'inline'
    else
      render plain: 'Not Found', status: :not_found
    end
  end
end
