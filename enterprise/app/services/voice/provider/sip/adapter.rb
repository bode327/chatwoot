class Voice::Provider::Sip::Adapter
  def initialize(channel)
    @channel = channel
  end

  def initiate_call(to:, conference_sid: nil, agent_id: nil)
    response = RestClient.post(
      config['server'],
      {
        to: to,
        from: @channel.phone_number,
        username: config['username'],
        password: config['password'],
        webhook_url: webhook_url,
        conference_sid: conference_sid,
        agent_id: agent_id
      }.to_json,
      { content_type: :json, accept: :json }
    )

    data = JSON.parse(response.body)

    # Expecting the external server to return a call_sid or we generate one
    call_sid = data['call_sid'] || "sip-#{SecureRandom.uuid}"

    {
      provider: 'sip',
      call_sid: call_sid,
      status: data['status'] || 'initiated',
      call_direction: 'outbound',
      requires_agent_join: true,
      agent_id: agent_id,
      conference_sid: conference_sid
    }
  rescue RestClient::ExceptionWithResponse => e
    Rails.logger.error "SIP Initiate Call Error: #{e.response}"
    raise e
  rescue StandardError => e
    Rails.logger.error "SIP Initiate Call Error: #{e.message}"
    raise e
  end

  def webhook_url
    digits = @channel.phone_number.delete_prefix('+')
    "#{ENV['FRONTEND_URL']}/webhooks/sip/#{digits}"
  end

  private

  def config
    @config ||= @channel.provider_config_hash
  end
end
