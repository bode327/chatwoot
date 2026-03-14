class CreatePlugins < ActiveRecord::Migration[7.0]
  def change
    create_table :plugins do |t|
      t.string :name, null: false
      t.string :identifier, null: false
      t.string :version, null: false
      t.text :description
      t.string :author
      t.boolean :active, default: true

      t.timestamps
    end
    add_index :plugins, :identifier, unique: true
  end
end
