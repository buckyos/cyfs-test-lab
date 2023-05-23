use cyfs_base::*;
use std::collections::{HashMap,HashSet,BTreeMap,BTreeSet};
use crate::{ObjType};

#[derive(Clone)]
pub struct StableSortData {
    pub name: String,
    pub create_time: u64,
    pub vec_list: Vec<String>,
    pub hash_set: HashSet<String>,
    pub hash_map: HashMap<String,String>,
    pub btree_map: BTreeMap<String,String>,
    pub btree_set: BTreeSet<String>,
}

impl StableSortData {
    pub fn new(name: String,create_time: u64,vec_list: Vec<String>,hash_set: HashSet<String>,hash_map: HashMap<String,String>,btree_map: BTreeMap<String,String>,btree_set: BTreeSet<String>,)-> Self {
        Self  {
            name,
            create_time,
            vec_list,
            hash_set,
            hash_map,
            btree_map,
            btree_set
        }
    }
}

pub fn vec_to_hashset(vec: Vec<String>) -> HashSet<String> {
    let hashset: HashSet<String> = vec.into_iter().collect();
    hashset
}

fn hashmap_to_btreemap(map: HashMap<String, String>) -> BTreeMap<String, String> {
    let tree_map: BTreeMap<String, String> = map.into_iter().collect();
    tree_map
}

fn vec_to_btreeset(vec: Vec<String>) -> BTreeSet<String> {
    let btreeset: BTreeSet<String> = vec.into_iter().collect();
    btreeset
}

fn hashset_to_vec(hashset: HashSet<String>) -> Vec<String> {
    let mut vec: Vec<String> = hashset.into_iter().collect();
    vec.sort(); // 可选，按字典顺序排序
    vec.dedup(); // 可选，去重
    vec
}
fn btreeset_to_vec(btreeset: BTreeSet<String>) -> Vec<String> {
    let vec: Vec<String> = btreeset.into_iter().collect();
    vec
}
fn btreemap_to_hashmap(map: BTreeMap<String, String>) -> HashMap<String, String> {
    let hashmap: HashMap<String, String> = map.into_iter().collect();
    hashmap
}


#[derive(ProtobufEncode, ProtobufDecode, Clone, ProtobufTransformType)]
#[cyfs_protobuf_type(crate::protos::StableSortDescContent)]
pub struct StableSortDescContent {
    name: String,
    create_time: u64,
    vec_list: Vec<String>,
    hash_set: HashSet<String>,
    hash_map: HashMap<String,String>,
    btree_map: BTreeMap<String,String>,
    btree_set: BTreeSet<String>,
}
impl  StableSortDescContent {
    pub fn show_vec_list(&self) {
        log::info!("Desc vec_list:");
        for item in &self.vec_list {
            log::info!("    {}", item);
        }
    }

    pub fn show_hash_set(&self) {
        log::info!("Desc hash_set:");
        for item in &self.hash_set {
            log::info!("    {}", item);
        }
    }

    pub fn show_hash_map(&self) {
        log::info!("Desc hash_map:");
        for (key, value) in &self.hash_map {
            log::info!("    {}: {}", key, value);
        }
    }

    pub fn show_btree_map(&self) {
        log::info!("Desc btree_map:");
        for (key, value) in &self.btree_map {
            log::info!("    {}: {}", key, value);
        }
    }

    pub fn show_btree_set(&self) {
        log::info!("Desc btree_set:");
        for item in &self.btree_set {
            log::info!("    {}", item);
        }
    }
}

impl ProtobufTransform<crate::protos::StableSortDescContent> for StableSortDescContent {
    fn transform(value: crate::protos::StableSortDescContent) -> BuckyResult<Self> {
        Ok(Self {
            name: value.name,
            create_time: value.create_time,
            vec_list: value.vec_list,
            hash_set: vec_to_hashset(value.hash_set),
            hash_map: value.hash_map,
            btree_map: hashmap_to_btreemap(value.btree_map),
            btree_set: vec_to_btreeset(value.btree_set),
        })
    }
}

impl ProtobufTransform<&StableSortDescContent> for crate::protos::StableSortDescContent {
    fn transform(value: &StableSortDescContent) -> BuckyResult<Self> {
        Ok(Self {
            name: value.name.clone(),
            create_time: value.create_time,
            vec_list: value.vec_list.clone(),
            hash_set: hashset_to_vec(value.hash_set.clone()),
            hash_map: value.hash_map.clone(),
            btree_map: btreemap_to_hashmap(value.btree_map.clone()),
            btree_set: btreeset_to_vec(value.btree_set.clone()),
        })
    }
}

impl DescContent for StableSortDescContent {
    fn obj_type() -> u16 {
        ObjType::StableSort as u16
    }

    type OwnerType = SubDescNone;
    type AreaType = SubDescNone;
    type AuthorType = SubDescNone;
    type PublicKeyType = SubDescNone;
}

#[derive(Default, ProtobufEmptyEncode, ProtobufEmptyDecode, Clone)]
pub struct StableSortBodyContent {
    name: String,
    create_time: u64,
    vec_list: Vec<String>,
    hash_set: HashSet<String>,
    hash_map: HashMap<String,String>,
    btree_map: BTreeMap<String,String>,
    btree_set: BTreeSet<String>,
}
impl  StableSortBodyContent {
    pub fn show_vec_list(&self) {
        log::info!("Body vec_list:");
        for item in &self.vec_list {
            log::info!("    {}", item);
        }
    }

    pub fn show_hash_set(&self) {
        log::info!("Body hash_set:");
        for item in &self.hash_set {
            log::info!("    {}", item);
        }
    }

    pub fn show_hash_map(&self) {
        log::info!("Body hash_map:");
        for (key, value) in &self.hash_map {
            log::info!("    {}: {}", key, value);
        }
    }

    pub fn show_btree_map(&self) {
        log::info!("Body btree_map:");
        for (key, value) in &self.btree_map {
            log::info!("    {}: {}", key, value);
        }
    }

    pub fn show_btree_set(&self) {
        log::info!("Body btree_set:");
        for item in &self.btree_set {
            log::info!("    {}", item);
        }
    }
}

impl ProtobufTransform<crate::protos::StableSortBodyContent> for StableSortBodyContent {
    fn transform(value: crate::protos::StableSortBodyContent) -> BuckyResult<Self> {
        Ok(Self {
            name: value.name,
            create_time: value.create_time,
            vec_list: value.vec_list,
            hash_set: vec_to_hashset(value.hash_set),
            hash_map: value.hash_map,
            btree_map: hashmap_to_btreemap(value.btree_map),
            btree_set: vec_to_btreeset(value.btree_set),
        })
    }
}

impl ProtobufTransform<&StableSortBodyContent> for crate::protos::StableSortBodyContent {
    fn transform(value: &StableSortBodyContent) -> BuckyResult<Self> {
        Ok(Self {
            name: value.name.clone(),
            create_time: value.create_time,
            vec_list: value.vec_list.clone(),
            hash_set: hashset_to_vec(value.hash_set.clone()),
            hash_map: value.hash_map.clone(),
            btree_map: btreemap_to_hashmap(value.btree_map.clone()),
            btree_set: btreeset_to_vec(value.btree_set.clone()),
        })
    }
}

impl BodyContent for StableSortBodyContent {
    fn format(&self) -> u8 {
        OBJECT_CONTENT_CODEC_FORMAT_PROTOBUF
    }
}


pub type StableSortType = NamedObjType<StableSortDescContent, StableSortBodyContent>;
pub type StableSortObjectBuilder = NamedObjectBuilder<StableSortDescContent, StableSortBodyContent>;
pub type StableSortObject = NamedObjectBase<StableSortType>;

pub trait StableSort {
    fn new(
        desc: StableSortData,
        body: StableSortData,
    ) -> Self;
    fn name(&self) -> &str;
    fn create_time(&self) -> u64;
    fn show(&self)->BuckyResult<()>;
}

impl StableSort for StableSortObject {
    fn new(
        desc: StableSortData,
        body: StableSortData,
    ) -> Self {
        let desc = StableSortDescContent {
            name : desc.name,
            create_time: desc.create_time,
            vec_list: desc.vec_list,
            hash_set: desc.hash_set,
            hash_map: desc.hash_map,
            btree_map: desc.btree_map,
            btree_set: desc.btree_set,
        };
        let body = StableSortBodyContent{
            name : body.name,
            create_time: body.create_time,
            vec_list: body.vec_list,
            hash_set: body.hash_set,
            hash_map: body.hash_map,
            btree_map: body.btree_map,
            btree_set: body.btree_set,
        };

        StableSortObjectBuilder::new(desc, body).no_create_time().build()
    }

    fn name(&self) -> &str {
        self.desc().content().name.as_str()
    }

    fn create_time(&self) -> u64 {
        self.desc().content().create_time
    }

    fn show(&self)->BuckyResult<()> {
        let _ = self.desc().content().show_btree_map();
        let _ = self.desc().content().show_btree_set();
        let _ = self.desc().content().show_hash_map();
        let _ = self.desc().content().show_hash_set();
        let _ = self.desc().content().show_vec_list();

        let _ = self.body_expect("body_info").content().show_btree_map();
        let _ = self.body_expect("body_info").content().show_btree_set();
        let _ = self.body_expect("body_info").content().show_hash_map();
        let _ = self.body_expect("body_info").content().show_hash_set();
        let _ = self.body_expect("body_info").content().show_vec_list();
        Ok(())
    }
}
