class SuperAdmin::PluginsController < SuperAdmin::ApplicationController
  def index
    if ActiveRecord::Base.connection.table_exists?('plugins')
      @plugins = Plugin.all
    else
      @plugins = []
      flash.now[:error] = "The 'plugins' database table does not exist. Please run database migrations or the SQL script from the documentation."
    end
  end

  def new
    @plugin = Plugin.new
  end

  def create
    if params[:plugin][:file].present?
      file_path = params[:plugin][:file].tempfile.path

      begin
        service = Plugins::LoaderService.new(file_path)
        @plugin = service.perform

        flash[:notice] = "Plugin #{@plugin.name} loaded successfully."
        redirect_to "/super_admin/plugins"
      rescue StandardError => e
        Rails.logger.error "Plugin Installation Failed: #{e.message}\n#{e.backtrace.join("\n")}"
        @plugin = Plugin.new
        flash[:error] = "Failed to load plugin: #{e.message.truncate(200)}"
        render :new
      end
    else
      @plugin = Plugin.new
      flash[:error] = "Please provide a valid zip file."
      render :new
    end
  end

  def show
    @plugin = Plugin.find(params[:id])
    @accounts = Account.all
  end

  def edit
    @plugin = Plugin.find(params[:id])
  end

  def update
    @plugin = Plugin.find(params[:id])

    # Handle plugin upgrade via zip file upload on the edit page
    if params[:plugin] && params[:plugin][:file].present?
      file_path = params[:plugin][:file].tempfile.path
      begin
        service = Plugins::LoaderService.new(file_path)
        updated_plugin = service.perform
        flash[:notice] = "Plugin #{updated_plugin.name} upgraded successfully to version #{updated_plugin.version}."
        redirect_to "/super_admin/plugins"
        return
      rescue StandardError => e
        Rails.logger.error "Plugin Upgrade Failed: #{e.message}\n#{e.backtrace.join("\n")}"
        flash[:error] = "Failed to upgrade plugin: #{e.message.truncate(200)}"
        render :edit
        return
      end
    end

    if @plugin.update(plugin_params)
      flash[:notice] = "Plugin updated successfully."
      redirect_to "/super_admin/plugins"
    else
      flash[:error] = "Failed to update plugin."
      render :edit
    end
  end

  def destroy
    @plugin = Plugin.find(params[:id])
    @plugin.destroy

    # Optional: Delete directory from storage/plugins
    plugin_dir = Rails.root.join('storage', 'plugins', @plugin.identifier)
    FileUtils.rm_rf(plugin_dir) if Dir.exist?(plugin_dir)

    flash[:notice] = "Plugin deleted successfully."
    redirect_to "/super_admin/plugins"
  end

  # Custom action to distribute the plugin
  def assign_to_account
    @plugin = Plugin.find(params[:id])
    @account = Account.find(params[:account_id])

    if params[:assign] == 'true'
      AccountPlugin.find_or_create_by!(account: @account, plugin: @plugin) do |ap|
        ap.active = true
      end
      flash[:notice] = "Plugin enabled for account #{@account.name}"
    else
      @account.account_plugins.where(plugin: @plugin).destroy_all
      flash[:notice] = "Plugin disabled for account #{@account.name}"
    end

    redirect_to "/super_admin/plugins/#{@plugin.id}"
  end

  private

  def plugin_params
    params.require(:plugin).permit(:active)
  end
end
