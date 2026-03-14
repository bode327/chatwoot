namespace :api, defaults: { format: 'json' } do
  namespace :v1 do
    resources :accounts, module: :accounts do
      namespace :plugins do
        namespace :gallery do
          get '/:contact_id/media', to: 'gallery#media'
        end
      end
    end
  end
end