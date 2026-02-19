class Webhooks::SipController < ActionController::API
  def process_payload
    # Find the channel by phone number
    channel = Channel::Voice.find_by(phone_number: params[:phone_number])
    return head :not_found unless channel

    # Validate provider is SIP
    return head :unprocessable_entity unless channel.provider == 'sip'

    # Process the status update
    # Expected payload: { status: 'ringing' | 'in-progress' | 'completed', call_sid: '...' }

    status = params[:status]
    call_sid = params[:call_sid]

    if status.present? && call_sid.present?
      # Assuming there is a service to update call status or we can update it directly if needed
      # For now, we can log it or call a service if it exists.
      # Chatwoot Voice implementation usually relies on Twilio callbacks which are handled by
      # Twilio::VoiceController. We might need a similar service here.

      # Example: trigger an event or update DB
      # ::Voice::StatusUpdateService.new(call_sid, status).perform

      Rails.logger.info "SIP Webhook received: #{params.inspect}"
    end

    head :ok
  rescue StandardError => e
    Rails.logger.error "SIP Webhook Error: #{e.message}"
    head :internal_server_error
  end
end
