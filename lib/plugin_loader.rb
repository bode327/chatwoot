class PluginLoader
  class << self
    def load_all_plugins
      Plugin.where(active: true).find_each do |plugin|
        load_single_plugin(plugin.identifier)
      end
    end

    def load_single_plugin(identifier)
      plugin_dir = Rails.root.join('storage', 'plugins', identifier)
      return unless Dir.exist?(plugin_dir)

      # 1. Load Custom Initializers or Backend Ruby Files
      backend_dir = plugin_dir.join('backend')

      if Dir.exist?(backend_dir.join('controllers'))
        if ActiveSupport::Dependencies.autoload_paths.frozen?
          # If frozen (which it usually is after boot in newer Rails), we can append to the $LOAD_PATH instead
          $LOAD_PATH << backend_dir.join('controllers').to_s
        else
          ActiveSupport::Dependencies.autoload_paths << backend_dir.join('controllers').to_s
        end
      end

      if Dir.exist?(backend_dir.join('models'))
        if ActiveSupport::Dependencies.autoload_paths.frozen?
          $LOAD_PATH << backend_dir.join('models').to_s
        else
          ActiveSupport::Dependencies.autoload_paths << backend_dir.join('models').to_s
        end
      end

      # 2. Inject Dynamic Routes
      # We achieve this dynamically by saving the active plugin routes
      # and letting Rails router read them during initialization or reload
      routes_file = backend_dir.join('routes.rb')
      if File.exist?(routes_file)
        Rails.application.routes.draw do
          instance_eval(File.read(routes_file))
        end
      end
    end
  end
end
