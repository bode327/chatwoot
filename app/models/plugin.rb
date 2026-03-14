class Plugin < ApplicationRecord
  has_many :account_plugins, dependent: :destroy
  has_many :accounts, through: :account_plugins

  validates :name, presence: true
  validates :identifier, presence: true, uniqueness: true
  validates :version, presence: true

  # Override logic to always activate when assigned, based on user's request
  after_create :assign_to_existing_accounts_if_auto_load

  def assign_to_existing_accounts_if_auto_load
    assign_to_all_accounts!
  end

  def assign_to_all_accounts!
    Account.find_each do |account|
      account_plugins.find_or_create_by!(account: account) do |ap|
        ap.active = true
      end
    end
  end
end
