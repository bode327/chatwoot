module Sip
  class VoiceController < ActionController::API
    before_action :set_inbox

    # Handle incoming call webhook from SIP Gateway
    # Expected params: from, to, call_sid
    def incoming_call
      # Find or create contact/conversation
      Voice::InboundCallBuilder.perform!(
        account: current_account,
        inbox: @inbox,
        from_number: params[:from],
        call_sid: params[:call_sid]
      )

      render json: { status: 'ringing' }
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Inbox not found' }, status: :not_found
    end

    # Handle call status updates (answered, completed, etc.)
    def status_callback
      Voice::StatusUpdateService.new(
        account: current_account,
        call_sid: params[:call_sid],
        call_status: params[:status],
        payload: params.to_unsafe_h
      ).perform

      head :ok
    rescue ActiveRecord::RecordNotFound
      head :not_found
    end

    private

    def set_inbox
      # Determine inbox based on 'to' or 'from' number (as the channel might be the sender or receiver)
      # Inbound: 'to' is the channel number.
      # Outbound status: 'from' (or caller_id) is likely the channel number.
      potential_numbers = [params[:to], params[:from]].compact
      channel = nil

      potential_numbers.each do |phone|
        channel = Channel::Voice.find_by(phone_number: phone)
        break if channel

        # Try with +
        unless phone.start_with?('+')
          channel = Channel::Voice.find_by(phone_number: "+#{phone}")
          break if channel
        end
      end

      raise ActiveRecord::RecordNotFound unless channel

      # Authenticate the webhook request
      if channel.provider_config['webhook_token'] != params[:token]
        Rails.logger.warn "SIP Webhook Authentication Failed for #{channel.phone_number}"
        raise ActiveRecord::RecordNotFound
      end

      @inbox = channel.inbox
    end

    def current_account
      @inbox.account
    end
  end
end
