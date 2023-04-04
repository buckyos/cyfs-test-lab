use std::sync::Arc;
use std::time::Duration;
use config::builder::DefaultState;
use config::ConfigBuilder;
use cyfs_lib::*;
use cyfs_base::*;
use cyfs_util::process::ProcessAction;
use cyfs_util::get_app_data_dir;



fn main() {
    cyfs_debug::ProcessDeadHelper::patch_task_min_thread();
    async_std::task::block_on(main_run());
}

async fn main_run() {
    let dec_str = "9tGpLNnHAp2vgMR5BcwVf4HWiELkP71JXWqRwED8Pvpn";
    let dec_id:cyfs_base::ObjectId = cyfs_base::ObjectId::from_base58(dec_str).unwrap();
    const NAME: &str = "rust-dec-app-service";
    let status = cyfs_util::process::check_cmd_and_exec(NAME);
    if status == ProcessAction::Install {
        std::process::exit(0);
    }

    cyfs_debug::CyfsLoggerBuilder::new_app(NAME)
        .level("debug")
        .console("debug")
        .enable_bdt(Some("debug"), Some("debug"))
        .module("cyfs-lib", Some("debug"), Some("debug"))
        .build()
        .unwrap()
        .start();

    cyfs_debug::PanicBuilder::new(NAME, NAME)
        .build()
        .start();

    let mut config_builder = ConfigBuilder::<DefaultState>::default()
        .set_default("challenge_interval", 24*3600).unwrap()
        .set_default("initial_challenge_live_time", 24*3600).unwrap()
        .set_default("store_challenge_live_time", 3600).unwrap();
    let data_dir = get_app_data_dir(NAME);
    let config_path = data_dir.join("config.toml");
    if config_path.exists() {
        let file = config::File::from(config_path.as_path());
        config_builder = config_builder.add_source(file);
    }
    let config = config_builder.build().unwrap();

    //let dec_id = DEC_ID;
    log::info!("----> dec id # {}", &dec_id);
    let mut stack_params = SharedCyfsStackParam::default(Some(dec_id.clone()));
    // stack_params.requestor_config = CyfsStackRequestorConfig::ws();
    let stack = Arc::new(SharedCyfsStack::open(stack_params).await.unwrap());
    stack.wait_online(None).await.unwrap();

    let path = RequestGlobalStatePath::new(None, Some("/QATest")).format_string();
    stack.root_state_meta_stub(None, None).add_access(GlobalStatePathAccessItem {
        path: path.clone(),
        access: GlobalStatePathGroupAccess::Default(AccessString::full().value()),
    }).await.unwrap();
    async_std::task::block_on(async_std::future::pending::<()>());
}
