class Voice::Provider::Sip::Adapter
  def initialize(channel)
    @channel = channel
  end

  def initiate_call(to:, conference_sid: nil, agent_id: nil)
    # Generic implementation for SIP Provider
    # This is a placeholder that returns a successful initiation response.
    # In a real integration, this would likely send an HTTP request to the SIP Gateway
    # defined in config['server'] to trigger an outbound call.

    # Example of what might happen:
    # gateway_url = config['server']
    # HTTP.post(gateway_url, json: { to: to, from: @channel.phone_number, ... })

    {
      provider: 'sip',
      call_sid: "sip-#{SecureRandom.uuid}",
      status: 'initiated',
      call_direction: 'outbound',
      requires_agent_join: true,
      agent_id: agent_id,
      conference_sid: conference_sid
    }
  end

  private

  def config
    @config ||= @channel.provider_config_hash
  end
end
