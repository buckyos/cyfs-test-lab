#![recursion_limit = "256"]

mod http;
use crate::{
    http::{*},
};
use hyper::{body::Buf};
use serde::{Deserialize,Serialize};
use hyper::{Body, Method,Client,  Request};
use cyfs_util::SYSTEM_INFO_MANAGER;
use clap::{App, Arg};
#[macro_use]
extern crate log;
use cyfs_debug::*;
use std::str::FromStr;
use std::{
    time::{Duration, Instant},
};
#[async_std::main]
async fn main() {
    cyfs_debug::CyfsLoggerBuilder::new_service("perf-report-tool")
        .level("info")
        .console("info")
        .enable_bdt(Some("warn"), Some("warn"))
        .build()
        .unwrap()
        .start();

    cyfs_debug::PanicBuilder::new("perf-report-tool", "perf-report-tool").build().start();
    let app = App::new("perf-report-tool")
        .version(cyfs_base::get_version())
        .about("perf-report-tool for cyfs-test-lab")
        .author("lizhihong <lizhihong@buckyos.com>")
        .arg(
            Arg::with_name("name")
                .short("n")
                .long("name")
                .takes_value(true)
                .help("the agent name")
                .default_value("agent name"),
        )
        .arg(
            Arg::with_name("testcaseId")
                .short("t")
                .long("testcaseId")
                .takes_value(true)
                .help("testcase id")
                .default_value("testcase id"),
        )
        .arg(
            Arg::with_name("interval")
                .short("i")
                .long("interval")
                .takes_value(true)
                .help("interval time")
                .default_value("60000"),
        );

    let matches = app.get_matches();
    let name = matches.value_of("name").map(str::to_string).unwrap();
    let test_case_id = matches.value_of("testcaseId").map(str::to_string).unwrap();
    let interval = matches.value_of("interval").unwrap().parse::<u64>().unwrap();

    let url = "http://192.168.100.205:5000/api/base/system_info/report";
    loop {
        let ret =  SYSTEM_INFO_MANAGER.get_system_info().await;
        let sysInfo = BDTTestSystemInfo {
            name : name.clone(),
            testcase_id : test_case_id.clone(),
            cpu_usage: ret.cpu_usage,
            total_memory: ret.total_memory,
            used_memory: ret.used_memory,
            received_bytes: ret.received_bytes,
            transmitted_bytes: ret.transmitted_bytes,
            ssd_disk_total: ret.ssd_disk_total,
            ssd_disk_avail:ret.ssd_disk_avail,
            hdd_disk_total: ret.hdd_disk_total,
            hdd_disk_avail: ret.hdd_disk_avail,
        };
        let json_body = serde_json::to_vec(&sysInfo).unwrap();
        //log::info!("start upload_system_info to server {:#?} ",json_body.clone());
        let get_json = request_json_post(url.clone(),Body::from(json_body)).await;
        log::info!("report bdt agent perf result = {:#?}", get_json);
        async_std::task::sleep(Duration::from_millis(interval.clone())).await; 
    }

    
}
