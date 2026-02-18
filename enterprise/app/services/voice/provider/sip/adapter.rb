require 'rest-client'

module Voice
  module Provider
    module Sip
      class Adapter
        def initialize(channel)
          @channel = channel
        end

        def initiate_call(to:, conference_sid: nil, agent_id: nil)
          Rails.logger.info "SIP Adapter: Initiating call to #{to} via #{@channel.provider_config['server']} using Gateway #{@channel.provider_config['gateway_url']}"

          payload = {
            from: @channel.phone_number,
            to: to,
            username: @channel.provider_config['username'],
            password: @channel.provider_config['password'],
            server: @channel.provider_config['server'],
            conference_sid: conference_sid,
            agent_id: agent_id,
            webhook_token: @channel.provider_config['webhook_token']
          }

          begin
            response = RestClient.post(
              @channel.provider_config['gateway_url'],
              payload.to_json,
              { content_type: :json, accept: :json }
            )

            parsed_response = JSON.parse(response.body)

            {
              provider: 'sip',
              call_sid: parsed_response['call_sid'] || "sip-#{SecureRandom.uuid}",
              status: parsed_response['status'] || 'initiated',
              call_direction: 'outbound',
              requires_agent_join: true,
              agent_id: agent_id,
              conference_sid: conference_sid
            }
          rescue RestClient::ExceptionWithResponse => e
            Rails.logger.error "SIP Gateway Error: #{e.response}"
            raise e
          rescue StandardError => e
            Rails.logger.error "SIP Adapter Error: #{e.message}"
            raise e
          end
        end

        private

        def config
          @config ||= @channel.provider_config_hash
        end
      end
    end
  end
end
