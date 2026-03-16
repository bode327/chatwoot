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
        $LOAD_PATH << backend_dir.join('controllers').to_s
        begin
          ActiveSupport::Dependencies.autoload_paths << backend_dir.join('controllers').to_s unless ActiveSupport::Dependencies.autoload_paths.frozen?
        rescue FrozenError
          # Already appended to $LOAD_PATH
        end
        # Explicitly require the files to bypass Zeitwerk cache issues when hot-loading
        Dir.glob(backend_dir.join('controllers', '**', '*.rb')).each do |file|
          require_dependency file
        end
      end

      if Dir.exist?(backend_dir.join('models'))
        $LOAD_PATH << backend_dir.join('models').to_s
        begin
          ActiveSupport::Dependencies.autoload_paths << backend_dir.join('models').to_s unless ActiveSupport::Dependencies.autoload_paths.frozen?
        rescue FrozenError
          # Already appended to $LOAD_PATH
        end
        # Explicitly require models
        Dir.glob(backend_dir.join('models', '**', '*.rb')).each do |file|
          require_dependency file
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
