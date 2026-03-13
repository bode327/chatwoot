require 'rails_helper'

RSpec.describe 'Api::V1::Accounts::Contacts::AttachmentsController', type: :request do
  let(:account) { create(:account) }
  let(:user) { create(:user, account: account, role: :agent) }
  let(:inbox) { create(:inbox, account: account) }
  let(:contact) { create(:contact, account: account) }
  let(:conversation) { create(:conversation, account: account, contact: contact, inbox: inbox, assignee: user) }
  let(:message) { create(:message, account: account, conversation: conversation) }

  before do
    # Give the user access to the inbox so it passes Conversations::PermissionFilterService
    create(:inbox_member, user: user, inbox: inbox)

    message.attachments.create!(
      account_id: account.id,
      file_type: :image,
      external_url: 'http://example.com/image.png'
    )
  end

  describe 'GET /api/v1/accounts/{account.id}/contacts/{contact.id}/attachments' do
    context 'when it is an unauthenticated user' do
      it 'returns unauthorized' do
        get "/api/v1/accounts/#{account.id}/contacts/#{contact.id}/attachments"

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when it is an authenticated user' do
      it 'returns attachments for the given contact' do
        get "/api/v1/accounts/#{account.id}/contacts/#{contact.id}/attachments",
            headers: user.create_new_auth_token,
            as: :json

        expect(response).to have_http_status(:success)
        expect(JSON.parse(response.body)['payload'].size).to eq(1)
        expect(JSON.parse(response.body)['payload'].first['message_id']).to eq(message.id)
      end

      it 'returns attachments filtered by file_type' do
        get "/api/v1/accounts/#{account.id}/contacts/#{contact.id}/attachments",
            params: { file_type: 'video' },
            headers: user.create_new_auth_token,
            as: :json

        expect(response).to have_http_status(:success)
        expect(JSON.parse(response.body)['payload'].size).to eq(0)
      end
    end
  end
end
