use cyfs_base::*;

use std::*;
use cyfs_base_tool::*;
use std::collections::{HashMap,HashSet,BTreeMap,BTreeSet};

#[cfg(test)]

mod tests {
    use super::*;
    #[tokio::test]
    async fn test_stable_sort_hashset() {
        run_test_async("test_stable_sort_hashset", async{
            let mut btreemap = BTreeMap::new();
            for i in 0..10{
                btreemap.insert(format!("ket{}",i),format!("value{}",i));
            }
            let mut btreeset = BTreeSet::new();
            for i in 0..10{
                btreeset.insert(format!("value{}",i));
            }
            let mut hashset = HashSet::new();
            for i in 0..10{
                hashset.insert(format!("value{}",i));
            }
            let mut hashmap = HashMap::new();
            for i in 0..10{
                hashmap.insert(format!("ket{}",i),format!("value{}",i));
            }
            let mut vec_list = vec!["Cat".to_string(), "Dog".to_string(), "Bird".to_string()];
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
            log::info!("original object {} id :{}",test_obj_proto.name(),test_obj_proto.desc().calculate_id());
            let _  = test_obj_proto.show();
            let object_decode :StableSortObject = StableSortObject::raw_decode(&test_obj_proto.to_vec().unwrap()).unwrap().0;
            log::info!("decode object {} id :{}",object_decode.name(),object_decode.desc().calculate_id());
            let _  = object_decode.show();            
        }).await    
        
    }
}




