require 'administrate/base_dashboard'

class AccountPluginDashboard < Administrate::BaseDashboard
  ATTRIBUTE_TYPES = {
    id: Field::Number,
    account: Field::BelongsTo,
    plugin: Field::BelongsTo,
    active: Field::Boolean,
    settings: Field::String.with_options(searchable: false),
    created_at: Field::DateTime,
    updated_at: Field::DateTime
  }.freeze

  COLLECTION_ATTRIBUTES = %i[
    id
    account
    plugin
    active
  ].freeze

  SHOW_PAGE_ATTRIBUTES = %i[
    id
    account
    plugin
    active
    settings
    created_at
    updated_at
  ].freeze

  FORM_ATTRIBUTES = %i[
    account
    plugin
    active
  ].freeze
end