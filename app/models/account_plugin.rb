class AccountPlugin < ApplicationRecord
  belongs_to :account
  belongs_to :plugin

  validates :account_id, uniqueness: { scope: :plugin_id }

  # Automatically activate plugin upon assignment based on user request
  after_initialize :set_default_active, if: :new_record?

  private

  def set_default_active
    self.active = true if active.nil?
  end
end
