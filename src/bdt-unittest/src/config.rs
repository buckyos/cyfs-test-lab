use std::{
    path::{Path, PathBuf}, str::FromStr,  
};
pub const SN_Lab : &str = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner.desc";
pub const PN_Lab : &str = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner.desc";

pub const SN_Beta : &str = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner-beta.desc";
pub const PN_Beta : &str = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner-beta.desc";

pub const SN_Nightly : &str = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\sn-miner-nightly.desc";
pub const PN_Nightly : &str = "E:\\git_test\\cyfs-test-lab\\src\\bdt-unittest\\tests\\config\\pn-miner-nightly.desc";
pub const Work_Space : &str = "E:\\git_test\\cyfs-test-lab\\deploy\\log";

pub fn SN_list()->Vec<PathBuf>{
    let sn_list : Vec<&str> = vec![SN_Lab];
    let mut sn_path = Vec::new();
    for sn in sn_list{
        let path = PathBuf::from_str(sn).unwrap();
        sn_path.push(path);
    }
    sn_path
}
pub fn PN_list()->Vec<PathBuf>{
    let pn_list : Vec<&str> = vec![PN_Lab];
    let mut pn_path = Vec::new();
    for pn in pn_list{
        let path = PathBuf::from_str(pn).unwrap();
        pn_path.push(path);
    }
    pn_path
}