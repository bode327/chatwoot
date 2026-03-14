class Plugins::LoaderService
  require 'zip'

  def initialize(file_path)
    @file_path = file_path
    @storage_dir = Rails.root.join('storage', 'plugins')
  end

  def perform
    FileUtils.mkdir_p(@storage_dir) unless Dir.exist?(@storage_dir)

    manifest = validate_and_extract_manifest
    return false unless manifest

    plugin_dir = @storage_dir.join(manifest['identifier'])

    # Remove older version if exists
    FileUtils.rm_rf(plugin_dir) if Dir.exist?(plugin_dir)
    FileUtils.mkdir_p(plugin_dir)

    # Extract all files
    Zip::File.open(@file_path) do |zip_file|
      zip_file.each do |f|
        f_path = File.join(plugin_dir, f.name)
        FileUtils.mkdir_p(File.dirname(f_path))
        zip_file.extract(f, f_path) unless File.exist?(f_path)
      end
    end

    # Register in DB
    plugin = Plugin.find_or_initialize_by(identifier: manifest['identifier'])
    plugin.assign_attributes(
      name: manifest['name'],
      version: manifest['version'],
      description: manifest['description'],
      author: manifest['author'],
      active: true
    )
    plugin.save!

    # Reload rails routes.
    # The config/initializers/plugin_loader.rb might need to run to re-inject.
    Rails.application.reload_routes!

    # Automatically load the newly installed plugin routes & code into the running Rails app
    # Doing this *after* reload_routes! ensures our dynamic append is not wiped
    PluginLoader.load_all_plugins

    plugin
  rescue StandardError => e
    Rails.logger.error("Failed to load plugin: #{e.message}")
    false
  end

  private

  def validate_and_extract_manifest
    manifest_content = nil
    Zip::File.open(@file_path) do |zip_file|
      manifest_entry = zip_file.find { |f| f.name == 'manifest.json' }
      raise "manifest.json not found in plugin zip" unless manifest_entry

      manifest_content = manifest_entry.get_input_stream.read
    end

    JSON.parse(manifest_content)
  rescue JSON::ParserError
    raise "Invalid manifest.json format"
  end
end
