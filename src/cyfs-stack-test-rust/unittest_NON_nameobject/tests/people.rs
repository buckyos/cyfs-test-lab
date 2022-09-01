use async_std::{future, io::prelude::*, task};
use cyfs_base::*;
use cyfs_util::*;
use std::path::Path;

// cargo test -- --nocapture
#[async_std::test]
async fn people() {
    let root = ::cyfs_util::get_cyfs_root_path().join("etc").join("desc");
    // 加载密钥
    let sec_file_name = format!("people.sec");
    let sec_file = root.join(sec_file_name);
    println!("{}", sec_file.display());
    if !sec_file.is_file() {
        let private_key = PrivateKey::generate_rsa(1024).unwrap();
        let _ = private_key.encode_to_file(sec_file.as_path(), false);
    }

    let mut buf: Vec<u8> = Vec::new();
    let ret = PrivateKey::decode_from_file(sec_file.as_path(), &mut buf);
    let (private_key, _) = ret.unwrap();

    let pubic_key = private_key.public();

    let mut p = People::new(None, Vec::new(), pubic_key.clone(), None, None, None)
        .no_create_time()
        .build();

    let p2 = People::new(None, Vec::new(), pubic_key, None, None, None)
        .no_create_time()
        .build();

    assert!(p.desc().people_id() == p2.desc().people_id());

    p.set_name("people".to_owned());

    let path = Path::new("../../people.obj");
    if !path.exists() {
        let _ = p.encode_to_file(path, false);
    }

    let user_data = vec![0u8; 100];
    let _ = p.body_mut().as_mut().unwrap().set_userdata(&user_data);

    let buf = p.to_vec().unwrap();
    let pp = People::clone_from_slice(&buf).unwrap();

    assert_eq!(p.desc().people_id(), pp.desc().people_id());
    assert_eq!(p.name(), pp.name());
    let mut buf = vec![];
    
    let (p1, _) = People::decode_from_file(&path, &mut buf).unwrap();
    assert_eq!(p.desc().people_id(), p1.desc().people_id());
    assert_eq!(p.name(), p1.name());
}