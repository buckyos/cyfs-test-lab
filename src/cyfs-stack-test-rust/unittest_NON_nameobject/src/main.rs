use clap::{App, Arg};
use std::collections::BTreeMap;
use async_std::fs;

mod procss;

#[async_std::main]
async fn main() {
    let app = App::new("non test")
    .version(cyfs_base::get_version())
    .about("name object test")
    .author("CYFS <dev@cyfs.com>")
    .arg(
        Arg::with_name("in")
            .long("in")
            .takes_value(false)
            .help("input json file"),
    )
    .arg(
        Arg::with_name("out")
            .long("out")
            .takes_value(false)
            .help("out json file"),
    )
    .arg(
        Arg::with_name("json_file")
            .long("json_file")
            .takes_value(true)
            .help("json file path"),
    );

    let matches = app.get_matches();
    let proc_in = matches.is_present("in");
    let proc_out = matches.is_present("out");
    let proc_file = matches.value_of("json_file").unwrap_or("./");

    println!("{}, {}, {}", proc_in, proc_out, proc_file);


    let procss = Procss::new(proc_in, proc_out, proc_file);
}
