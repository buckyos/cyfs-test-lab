use cyfs_base::*;

use std::*;
use cyfs_base_tool::*;
use std::collections::{HashMap,HashSet,BTreeMap,BTreeSet};

#[cfg(test)]

mod tests {
    use super::*;
    #[tokio::test]
    async fn test_protobuf_object_stable_sort_hashset() {
        run_test_async("Test Protobuf NameObject  stable_sort_hashset", async{
            let mut btreemap = BTreeMap::new();
            for i in 0..10{
                btreemap.insert(format!("ket{}",i),format!("value{}",i));
            }
            let mut btreeset = BTreeSet::new();
            for i in 0..10{
                btreeset.insert(format!("btreeset_value{}",i));
            }
            let mut hashset = HashSet::new();
            for i in 0..10{
                hashset.insert(format!("hashset_value{}",i));
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
            assert_eq!(test_obj_proto.desc().calculate_id(),object_decode.desc().calculate_id());
            assert_eq!(test_obj_proto.desc().content().name,object_decode.desc().content().name);
            assert_eq!(test_obj_proto.desc().content().create_time,object_decode.desc().content().create_time);
            assert_eq!(test_obj_proto.desc().content().vec_list,object_decode.desc().content().vec_list);  
            assert_eq!(test_obj_proto.desc().content().hash_set,object_decode.desc().content().hash_set);  
            assert_eq!(test_obj_proto.desc().content().hash_map,object_decode.desc().content().hash_map);
            assert_eq!(test_obj_proto.desc().content().btree_map,object_decode.desc().content().btree_map);  
            assert_eq!(test_obj_proto.desc().content().btree_set,object_decode.desc().content().btree_set);  

            assert_eq!(test_obj_proto.body_expect("xx").content().name,object_decode.body_expect("xx").content().name);
            assert_eq!(test_obj_proto.body_expect("xx").content().create_time,object_decode.body_expect("xx").content().create_time);
            assert_eq!(test_obj_proto.body_expect("xx").content().vec_list,object_decode.body_expect("xx").content().vec_list);  
            assert_eq!(test_obj_proto.body_expect("xx").content().hash_set,object_decode.body_expect("xx").content().hash_set);  
            assert_eq!(test_obj_proto.body_expect("xx").content().hash_map,object_decode.body_expect("xx").content().hash_map);
            assert_eq!(test_obj_proto.body_expect("xx").content().btree_map,object_decode.body_expect("xx").content().btree_map);  
            assert_eq!(test_obj_proto.body_expect("xx").content().btree_set,object_decode.body_expect("xx").content().btree_set);               
        }).await    
        
    }
    #[tokio::test]
    async fn test_raw_object_stable_sort_hashset() {
        run_test_async("Test Raw NameObject  stable_sort_hashset", async{
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
            let test_data = RawStableSortData::new(
                "desc info".to_string(),
                system_time_to_bucky_time(&std::time::SystemTime::now()), 
                vec_list, 
                hashset, 
                hashmap, 
                btreemap, 
                btreeset
            );
            let test_obj_raw:RawDataObject = RawDataObject::new(test_data.clone(),test_data); 
            log::info!("original object {} id :{}",test_obj_raw.name(),test_obj_raw.desc().calculate_id());
            let _  = test_obj_raw.show();
            let object_decode :RawDataObject = RawDataObject::raw_decode(&test_obj_raw.to_vec().unwrap()).unwrap().0;
            log::info!("decode object {} id :{}",object_decode.name(),object_decode.desc().calculate_id());
            let _  = object_decode.show();
            assert_eq!(test_obj_raw.desc().content().name,object_decode.desc().content().name);
            assert_eq!(test_obj_raw.desc().content().create_time,object_decode.desc().content().create_time);
            assert_eq!(test_obj_raw.desc().content().vec_list,object_decode.desc().content().vec_list);  
            assert_eq!(test_obj_raw.desc().content().hash_set,object_decode.desc().content().hash_set);  
            assert_eq!(test_obj_raw.desc().content().hash_map,object_decode.desc().content().hash_map);
            assert_eq!(test_obj_raw.desc().content().btree_map,object_decode.desc().content().btree_map);  
            assert_eq!(test_obj_raw.desc().content().btree_set,object_decode.desc().content().btree_set);  

            assert_eq!(test_obj_raw.body_expect("xx").content().name,object_decode.body_expect("xx").content().name);
            assert_eq!(test_obj_raw.body_expect("xx").content().create_time,object_decode.body_expect("xx").content().create_time);
            assert_eq!(test_obj_raw.body_expect("xx").content().vec_list,object_decode.body_expect("xx").content().vec_list);  
            assert_eq!(test_obj_raw.body_expect("xx").content().hash_set,object_decode.body_expect("xx").content().hash_set);  
            assert_eq!(test_obj_raw.body_expect("xx").content().hash_map,object_decode.body_expect("xx").content().hash_map);
            assert_eq!(test_obj_raw.body_expect("xx").content().btree_map,object_decode.body_expect("xx").content().btree_map);  
            assert_eq!(test_obj_raw.body_expect("xx").content().btree_set,object_decode.body_expect("xx").content().btree_set);                 
        }).await    
        
    }


    #[tokio::test]
    async fn test_base_object_group() {
        run_test_async("Test Base NameObject  group", async{
            let mut member_list : Vec<GroupMember> =vec![GroupMember::new( ObjectId::default(), format!("title_test"))];
            for i in 0..10{
                member_list.insert(i, GroupMember::new( ObjectId::default(), format!("title{}",i)));
            }
            let group_object : Group = Group::new_simple_group(None, member_list, Area::default()).build();  
            log::info!("group_object id = {}",group_object.desc().calculate_id());
            let object_decode :Group = Group::raw_decode(&group_object.to_vec().unwrap()).unwrap().0;
            log::info!("decode object  id = {}",object_decode.desc().calculate_id());        
        }).await    
        
    }


}




