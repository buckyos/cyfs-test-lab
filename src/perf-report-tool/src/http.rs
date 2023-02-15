use hyper::{body::Buf};
use serde::{Deserialize,Serialize};
use hyper::{Body, Method,Client,  Request};


#[derive(Debug, Serialize, Deserialize)]
pub struct GetResult {
    pub args: Option<Args>,
    pub data: Option<String>,
    pub files: Option<Args>,
    pub form: Option<Args>,
    pub headers: Option<Headers>,
    pub json: Option<serde_json::Value>,
    pub origin: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Args {
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Headers {
    #[serde(rename = "Accept")]
    pub accept: Option<String>,
    #[serde(rename = "Accept-Encoding")]
    pub accept_encoding: Option<String>,
    #[serde(rename = "Accept-Language")]
    pub accept_language: Option<String>,
    #[serde(rename = "Dnt")]
    pub dnt: Option<String>,
    #[serde(rename = "Host")]
    pub host: Option<String>,
    #[serde(rename = "Origin")]
    pub origin: Option<String>,
    #[serde(rename = "Referer")]
    pub referer: Option<String>,
    #[serde(rename = "Sec-Ch-Ua")]
    pub sec_ch_ua: Option<String>,
    #[serde(rename = "Sec-Ch-Ua-Mobile")]
    pub sec_ch_ua_mobile: Option<String>,
    #[serde(rename = "Sec-Ch-Ua-Platform")]
    pub sec_ch_ua_platform: Option<String>,
    #[serde(rename = "Sec-Fetch-Dest")]
    pub sec_fetch_dest: Option<String>,
    #[serde(rename = "Sec-Fetch-Mode")]
    pub sec_fetch_mode: Option<String>,
    #[serde(rename = "Sec-Fetch-Site")]
    pub sec_fetch_site: Option<String>,
    #[serde(rename = "User-Agent")]
    pub user_agent: Option<String>,
    #[serde(rename = "X-Amzn-Trace-Id")]
    pub x_amzn_trace_id: Option<String>,
}


// fn default_client()->hyper::Client{
//     Client::builder().pool_idle_timeout(Duration::from_sec(30)).build_http()
// }

#[derive(Serialize, Deserialize)]
pub struct BDTTestSystemInfo {
    pub name : String,
    pub testcase_id : String,
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    // 每个刷新周期之间的传输的bytes
    pub received_bytes: u64,
    pub transmitted_bytes: u64,

    // SSD硬盘容量和可用容量，包括Unknown
    pub ssd_disk_total: u64,
    pub ssd_disk_avail: u64,

    // HDD硬盘容量和可用容量
    pub hdd_disk_total: u64,
    pub hdd_disk_avail: u64,
}

pub async fn request_json_get(url: hyper::Uri) -> anyhow::Result<GetResult> {
    let client = Client::new();

    // Fetch the url...
    let res = client.get(url).await?;

    // asynchronously aggregate the chunks of the body
    let body = hyper::body::aggregate(res).await?;

    // try to parse as json with serde_json
    let get_result:GetResult = serde_json::from_reader(body.reader())?;

    Ok(get_result)
}

pub async fn request_json_post(uri:&str,json_body:Body) -> anyhow::Result<GetResult> {
    let client = Client::new();
    let req = Request::builder().method(Method::POST).uri(uri)
    .header("Content-Type", "application/json")
    .body(json_body)?;
    // Fetch the url...
    let res = client.request(req).await?;
    // asynchronously aggregate the chunks of the body
    let body = hyper::body::aggregate(res).await?;
    // try to parse as json with serde_json
    let get_result:GetResult = serde_json::from_reader(body.reader())?;
    Ok(get_result)
}
