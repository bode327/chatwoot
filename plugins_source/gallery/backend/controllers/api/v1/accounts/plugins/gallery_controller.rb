module Api
  module V1
    module Accounts
      module Plugins
        class GalleryController < Api::V1::Accounts::BaseController
          before_action :set_contact
          before_action :check_authorization

          def media
    # Find all conversations for this contact
    conversation_ids = @contact.conversations.pluck(:id)

    # Fetch all attachments related to these conversations
    @attachments = Attachment
                     .joins(:message)
                     .where(message: { conversation_id: conversation_ids })
                     .order(created_at: :desc)
                     .limit(100)

    # Fetch messages containing URLs
    url_regex = %r{https?://[^\s<>]+}
    @messages_with_links = Message
                            .where(conversation_id: conversation_ids)
                            .where("content ~ ?", 'https?://')
                            .order(created_at: :desc)
                            .limit(100)

    results = @attachments.map { |a|
      {
        id: "attachment_#{a.id}",
        url: a.download_url,
        file_type: a.file_type, # image, audio, video, file
        created_at: a.created_at,
        message_id: a.message_id
      }
    }

    @messages_with_links.each do |msg|
      urls = msg.content.scan(url_regex)
      urls.each_with_index do |url, index|
        results << {
          id: "link_#{msg.id}_#{index}",
          url: url,
          file_type: 'link',
          created_at: msg.created_at,
          message_id: msg.id
        }
      end
    end

    results.sort_by! { |item| item[:created_at] }.reverse!

    render json: results
  end

  private

  def set_contact
    @contact = Current.account.contacts.find(params[:contact_id])
    head :not_found unless @contact
  end

          def check_authorization
            authorize @contact, :show?
          end
        end
      end
    end
  end
end