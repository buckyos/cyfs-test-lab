#![recursion_limit = "256"]

mod loader;
mod profile;
mod user;
mod zone;

#[macro_use]
extern crate log;

use cyfs_debug::*;
use loader::*;

use clap::{App, Arg};
use std::str::FromStr;

#[async_std::main]
async fn main() {
    let app = App::new("zone-simulator")
        .version(cyfs_base::get_version())
        .about("zone-simulator tools for cyfs system")
        .author("liyaxing <liyaxing@buckyos.com>")
        .arg(
            Arg::with_name("dump")
                .short("d")
                .long("dump")
                .takes_value(false)
                .help("Dump all desc/sec files to {cyfs}/etc/zone-simulator"),
        )
        .arg(
            Arg::with_name("random_mnemonic")
                .short("r")
                .long("random")
                .takes_value(false)
                .help("Generate random random mnemonic"),
        )
        .arg(
            Arg::with_name("user_num")
                .long("user_num")
                .takes_value(true)
                .help("user_num")
                .default_value("2"),
        )
        .arg(
            Arg::with_name("bdt_port")
                .long("bdt_port")
                .takes_value(true)
                .help("default begin bdt_port")
                .default_value("20000"),
        )
        .arg(
            Arg::with_name("service_port")
                .long("service_port")
                .takes_value(true)
                .help("default begin service_port")
                .default_value("21000"),
        );

    let matches = app.get_matches();
    let user_num = usize::from_str(matches.value_of("user_num").unwrap()).unwrap();
    let bdt_port = u16::from_str(matches.value_of("bdt_port").unwrap()).unwrap();
    let service_port = u16::from_str(matches.value_of("service_port").unwrap()).unwrap();

    let random_mnemonic = matches.is_present("random_mnemonic");
    if random_mnemonic {
        loader::random_mnemonic();
        std::process::exit(0);
    }

    let dump = matches.is_present("dump");

    CyfsLoggerBuilder::new_app("zone-simulator")
        .level("trace")
        .console("trace")
        .enable_bdt(Some("warn"), Some("warn"))
        .build()
        .unwrap()
        .start();

    PanicBuilder::new("tools", "zone-simulator")
        .exit_on_panic(true)
        .build()
        .start();

    // 首先加载助记词
    profile::TEST_PROFILE.load();

    let users =
        TestLoader::load_users(profile::TEST_PROFILE.get_mnemonic(), true, dump, user_num).await;
    profile::TEST_PROFILE.save_desc();

    let mut index = 0;
    for user in users {
        TestLoader::load_stack(user, bdt_port + index, service_port + index).await;
        index = index + 10;
    }
    async_std::task::sleep(std::time::Duration::from_millis(u64::MAX)).await;
}
