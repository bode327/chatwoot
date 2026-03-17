# test_plugin.rb
account = Account.first
contact = account.contacts.first
conversation_ids = contact.conversations.pluck(:id)
attachments = Attachment.joins(:message).where(message: { conversation_id: conversation_ids })
puts "Conversations: #{conversation_ids.inspect}"
puts "Attachments found: #{attachments.count}"
