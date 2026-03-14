require 'administrate/base_dashboard'

class PluginDashboard < Administrate::BaseDashboard
  ATTRIBUTE_TYPES = {
    id: Field::Number,
    name: Field::String,
    identifier: Field::String,
    version: Field::String,
    description: Field::Text,
    author: Field::String,
    active: Field::Boolean,
    accounts: Field::HasMany,
    created_at: Field::DateTime,
    updated_at: Field::DateTime
  }.freeze

  COLLECTION_ATTRIBUTES = %i[
    id
    name
    identifier
    version
    active
  ].freeze

  SHOW_PAGE_ATTRIBUTES = %i[
    id
    name
    identifier
    version
    description
    author
    active
    accounts
    created_at
    updated_at
  ].freeze

  FORM_ATTRIBUTES = %i[
    active
  ].freeze

  def display_resource(plugin)
    "Plugin ##{plugin.id} - #{plugin.name}"
  end
end