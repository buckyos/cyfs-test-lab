use cyfs_base::*;

#[async_std::main]
async fn main()->Result<(), BuckyError> {
    #[cfg(debug_assertions)]
    let log_default_level = "debug";

    #[cfg(not(debug_assertions))]
    let log_default_level = "debug";

    let log_dir : String = "C:\\git_test\\cyfs-test-lab\\deploy\\log".to_string();
    #[cfg(debug_assertions)]
    //let log_default_level = "info";
    cyfs_debug::CyfsLoggerBuilder::new_app("bdt-unittest")
        .level("info")
        .console("warn")
        .directory(log_dir.clone())
        .build()
        .unwrap()
        .start();
    //panic异常捕获
    cyfs_debug::PanicBuilder::new("bdt-unittest", "bdt-unittest")
        .exit_on_panic(true)
        .build()
        .start();
    
    Ok(())
}