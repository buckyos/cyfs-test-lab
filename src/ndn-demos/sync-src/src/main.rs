use cyfs_base::*;


#[async_std::main]
async fn main() {
    cyfs_debug::CyfsLoggerBuilder::new_app("ndn-demo-sync-src")
        .level("debug")
        .console("debug")
        .enable_bdt(Some("off"), Some("off"))
        .module("non-lib", Some("off"), Some("off"))
        .build()
        .unwrap()
        .start();

    cyfs_debug::PanicBuilder::new("ndn-demo-sync-src", "ndn-demo-sync-src")
        .build()
        .start();

    
}