use cyfs_base::*;

mod objects;
mod protos;
use objects::*;
use protos::*;

use async_std;
use std::collections::{HashMap,HashSet,BTreeMap,BTreeSet};

#[async_std::main]
async fn main()-> Result<(), BuckyError> {
    print!("Hello CYFS!");
    let mut btreemap = BTreeMap::new();
    btreemap.insert("one".to_string(), "uno".to_string());
    btreemap.insert("two".to_string(), "dos".to_string());
    btreemap.insert("three".to_string(), "tres".to_string());
    let mut btreeset = BTreeSet::new();
    btreeset.insert("Cat".to_string());
    btreeset.insert("Dog".to_string());
    btreeset.insert("Bird".to_string());
    let mut hashset = HashSet::new();
    hashset.insert("Cat".to_string());
    hashset.insert("Dog".to_string());
    hashset.insert("Bird".to_string());
    let mut hashmap = HashMap::new();
    hashmap.insert("one".to_string(), "uno".to_string());
    hashmap.insert("two".to_string(), "dos".to_string());
    hashmap.insert("three".to_string(), "tres".to_string());
    let vec_list = vec!["Cat".to_string(), "Dog".to_string(), "Bird".to_string()];

    let test_data = StableSortData::new(
        "desc info".to_string(),
        system_time_to_bucky_time(&std::time::SystemTime::now()), 
        vec_list, 
        hashset, 
        hashmap, 
        btreemap, 
        btreeset
    );
    let test_obj_proto:StableSortObject = StableSortObject::new(test_data.clone(),test_data);
    print!("test_obj_proto id :{}",test_obj_proto.desc().object_id().to_string());
    Ok(())
}