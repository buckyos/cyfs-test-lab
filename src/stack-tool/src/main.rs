#![recursion_limit = "256"]

use clap::{App, Arg};
#[macro_use]
extern crate log;
use cyfs_debug::*;
use cyfs_base::*;
use std::str::FromStr;
use std::{
    time::{Duration, Instant},
};
#[async_std::main]
async fn main() {
    cyfs_debug::CyfsLoggerBuilder::new_service("stack_tool")
        .level("info")
        .console("info")
        .enable_bdt(Some("warn"), Some("warn"))
        .build()
        .unwrap()
        .start();

    cyfs_debug::PanicBuilder::new("stack_tool", "stack_tool").build().start();
    let app = App::new("stack_tool")
        .version(cyfs_base::get_version())
        .about("stack_tool for cyfs-test-lab")
        .author("lizhihong <lizhihong@buckyos.com>")
        .arg(
            Arg::with_name("object_id")
                .short("i")
                .long("id")
                .takes_value(true)
                .help(""),
        );
    let matches = app.get_matches();
    let object_str = matches.value_of("object_id").map(str::to_string).unwrap();
    let object_id = ObjectId::from_base58(object_str.as_str()).unwrap();
    let _ = match object_id.info().area(){
        Some(area)=>{
            log::info!("area = {}", area.to_string()); 
        },
        None=>{
            log::info!("area = None");      
        }
    };
    
    
}
