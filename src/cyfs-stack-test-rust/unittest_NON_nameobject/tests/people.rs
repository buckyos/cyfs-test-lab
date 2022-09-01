use async_std::{future, io::prelude::*, task};
use cyfs_base::*;
use cyfs_util::*;
use std::{path::Path, str::FromStr};

// cargo test -- --nocapture
#[async_std::test]
async fn people() {
    let temp = ::cyfs_util::get_temp_path();
    // 加载密钥
    let sec_file_name = format!("people.sec");
    let sec_file = temp.join(sec_file_name);
    println!("{}", sec_file.display());
    if !sec_file.is_file() {
        let private_key = PrivateKey::generate_rsa(1024).unwrap();
        let _ = private_key.encode_to_file(sec_file.as_path(), false);
    }

    let mut buf: Vec<u8> = Vec::new();
    let ret = PrivateKey::decode_from_file(sec_file.as_path(), &mut buf);
    let (private_key, _) = ret.unwrap();

    let pubic_key = private_key.public();

    let name = "TEST123456!@#$%^";
    let owner = ObjectId::from_str("5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC").unwrap();
    let device_id = DeviceId::from_str("5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ").unwrap();
    let ood_list = vec![device_id];
    let area = Area::new(1, 2, 3, 4);
    let file_id = FileId::from_str("7Tk94YfZjQQETp7wnMZPg9CiqZWNDwSTAxnXfCAG62Vu").unwrap();
    let icon = file_id;
    let people_file = temp.join("people.obj");
    if !people_file.is_file() {
        let p = People::new(
            Some(owner), 
            ood_list.to_owned(), 
            pubic_key.clone(), 
            Some(area), 
            Some(name.to_string()), 
            Some(icon)
        )
        .no_create_time()
        .build();

        if !people_file.exists() {
            let _ = p.encode_to_file(people_file.as_path(), false);
        }

        let buf = p.to_vec().unwrap();
        let pp = People::clone_from_slice(&buf).unwrap();

        assert_eq!(p.desc().people_id(), pp.desc().people_id());
        assert_eq!(p.name(), pp.name());
        assert_eq!(p.icon(), pp.icon());
        assert_eq!(p.ood_list(), pp.ood_list());

        let mut buf = vec![];
        
        let (p1, _) = People::decode_from_file(&people_file, &mut buf).unwrap();
        assert_eq!(p.desc().people_id(), p1.desc().people_id());
        assert_eq!(p.name(), p1.name());
        assert_eq!(p.icon(), p1.icon());
        assert_eq!(p.ood_list(), p1.ood_list());

    } else {
        let mut buf = vec![];
        let (p1, _) = People::decode_from_file(&people_file, &mut buf).unwrap();
        assert_eq!(owner, p1.desc().owner().unwrap());
        assert_eq!(name, p1.name().unwrap());
        assert_eq!(icon, *p1.icon().unwrap());

        assert_eq!(ood_list, *p1.ood_list());
        println!("{}", name);
    }


}