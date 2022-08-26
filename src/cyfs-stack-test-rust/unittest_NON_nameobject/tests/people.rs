use async_std::{future, io::prelude::*, task};
use cyfs_base::*;
use std::path::Path;
use std::fs::{create_dir};

#[async_std::test]
async fn people() {
    let private_key = PrivateKey::generate_rsa(1024).unwrap();

    let pubic_key = private_key.public();

    let mut p = People::new(None, Vec::new(), pubic_key.clone(), None, None, None)
        .no_create_time()
        .build();

    let p2 = People::new(None, Vec::new(), pubic_key, None, None, None)
        .no_create_time()
        .build();

    assert!(p.desc().people_id() == p2.desc().people_id());

    p.set_name("people".to_owned());

    let path = Path::new("c:\\test\\people.obj");
    create_dir("c:\\test").unwrap();
    if path.parent().unwrap().exists() {
        let _ = p.encode_to_file(path, false);
    }

    let user_data = vec![0u8; 100];
    let _ = p.body_mut().as_mut().unwrap().set_userdata(&user_data);

    let buf = p.to_vec().unwrap();
    let pp = People::clone_from_slice(&buf).unwrap();

    assert_eq!(p.desc().people_id(), pp.desc().people_id());
    assert_eq!(p.name(), pp.name());
}