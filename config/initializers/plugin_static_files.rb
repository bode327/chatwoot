# IMPORTANT: Serving only the `storage/plugins` directory instead of the entire `storage`
# directory which contains sensitive user uploads and exports.
Rails.application.config.middleware.insert_before ActionDispatch::Static, ActionDispatch::Static, Rails.root.join('storage', 'plugins').to_s, index: 'index.html', headers: { 'Access-Control-Allow-Origin' => '*' }
