class Api::V1::Accounts::Contacts::AttachmentsController < Api::V1::Accounts::Contacts::BaseController
  def index
    conversations = Current.account.conversations.where(contact_id: @contact.id)

    # Apply permission-based filtering
    conversations = Conversations::PermissionFilterService.new(
      conversations,
      Current.user,
      Current.account
    ).perform

    # Use basic pagination or just load what's requested. We will use `pluck(:id)` safely by joining correctly.
    # To improve performance, we just join messages to the filtered conversations subquery.
    @attachments = Attachment.joins(:message)
                             .where(messages: { conversation_id: conversations.select(:id) })
                             .includes(message: :sender)
                             .order('attachments.created_at DESC')

    return if params[:file_type].blank?

    @attachments = @attachments.where(file_type: params[:file_type])
  end
end
