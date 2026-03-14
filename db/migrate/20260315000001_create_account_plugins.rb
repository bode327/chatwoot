class CreateAccountPlugins < ActiveRecord::Migration[7.0]
  def change
    create_table :account_plugins do |t|
      t.references :account, null: false, foreign_key: true
      t.references :plugin, null: false, foreign_key: true
      t.jsonb :settings, default: {}
      t.boolean :active, default: true

      t.timestamps
    end
    add_index :account_plugins, [:account_id, :plugin_id], unique: true
  end
end
