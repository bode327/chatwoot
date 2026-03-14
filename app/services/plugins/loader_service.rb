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

    # Determine the root prefix if the user zipped a folder instead of the contents directly
    root_prefix = nil
    Zip::File.open(@file_path) do |zip_file|
      manifest_entry = zip_file.find { |f| f.name.match?(/^(.*\/)?manifest\.json$/) }
      if manifest_entry
        match = manifest_entry.name.match(/^(.*\/)manifest\.json$/)
        root_prefix = match[1] if match
      end
    end

    # Extract all files, stripping the root prefix if it exists
    Zip::File.open(@file_path) do |zip_file|
      zip_file.each do |f|
        # Strip root folder path if user zipped the parent directory
        relative_path = root_prefix ? f.name.sub(/^#{Regexp.escape(root_prefix)}/, '') : f.name

        # Skip if the path is empty (e.g. it was just the root folder entry)
        next if relative_path.blank?

        f_path = File.join(plugin_dir, relative_path)
        FileUtils.mkdir_p(File.dirname(f_path))
        zip_file.extract(f, f_path) unless File.exist?(f_path) || f.name.end_with?('/')
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
  end

  private

  def validate_and_extract_manifest
    manifest_content = nil

    Zip::File.open(@file_path) do |zip_file|
      # Look for manifest.json, handling cases where the user zipped the parent folder instead of its contents
      # This matches exactly 'manifest.json' or 'something/manifest.json' (but ignores deeper nesting for safety)
      manifest_entry = zip_file.find { |f| f.name.match?(/^(.*\/)?manifest\.json$/) }

      raise "manifest.json not found in plugin zip. Please ensure your zip file contains manifest.json at its root." unless manifest_entry

      manifest_content = manifest_entry.get_input_stream.read
    end

    JSON.parse(manifest_content)
  rescue JSON::ParserError
    raise "Invalid manifest.json format"
  end
end
