require 'rubyzip'
require_relative 'config/environment'
path = Rails.root.join('plugins_source/gallery.zip').to_s
begin
  plugin = Plugins::LoaderService.new(path).perform
  puts 'Success! Plugin loaded:'
  puts plugin.inspect
rescue => e
  puts 'Error loading plugin:'
  puts e.message
  puts e.backtrace.join(%Q{\n})
end
