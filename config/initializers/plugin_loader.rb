Rails.application.config.after_initialize do
  # Load active plugins dynamically on boot
  # Rescuing ActiveRecord::NoDatabaseError is useful for initial migrations
  begin
    PluginLoader.load_all_plugins if defined?(Plugin) && ActiveRecord::Base.connection.table_exists?('plugins')
  rescue ActiveRecord::NoDatabaseError, ActiveRecord::ConnectionNotEstablished, PG::ConnectionBad
    Rails.logger.warn "Database not ready, skipping plugin loading."
  end
end