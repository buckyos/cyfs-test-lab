use cyfs_base::*;
use std::collections::{HashMap,HashSet,BTreeMap,BTreeSet};
use crate::{ObjType};

#[derive(Clone)]
pub struct RawStableSortData {
    pub name: String,
    pub create_time: u64,
    pub vec_list: Vec<String>,
    pub hash_set: HashSet<String>,
    pub hash_map: HashMap<String,String>,
    pub btree_map: BTreeMap<String,String>,
    pub btree_set: BTreeSet<String>,
}

impl RawStableSortData {
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
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RawDataDescContent {
    pub name: String,
    pub create_time: u64,
    pub vec_list: Vec<String>,
    pub hash_set: HashSet<String>,
    pub hash_map: HashMap<String,String>,
    pub btree_map: BTreeMap<String,String>,
    pub btree_set: BTreeSet<String>,
}


impl RawDataDescContent {
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

impl DescContent for RawDataDescContent {
    fn obj_type() -> u16 {
        ObjType::StableSort as u16
    }
    type OwnerType = SubDescNone;
    type AreaType = SubDescNone;
    type AuthorType = SubDescNone;
    type PublicKeyType = SubDescNone;
}

impl RawEncode for RawDataDescContent {
    fn raw_measure(&self, purpose: &Option<RawEncodePurpose>) -> Result<usize, BuckyError> {
        let size = 0 + self.name.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_measure name error:{}", e);
            e
        })?  + self.create_time.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_measure create_time error:{}", e);
            e
        })? + self.vec_list.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_measure vec_list error:{}", e);
            e
        })? + self.hash_set.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_measure hash_set error:{}", e);
            e
        })? + self.hash_map.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_measure hash_map error:{}", e);
            e
        })? + self.btree_map.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_measure btree_map error:{}", e);
            e
        })? + self.btree_set.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_measure btree_set error:{}", e);
            e
        })?;
        Ok(size)
    }

    fn raw_encode<'a>(
        &self,
        buf: &'a mut [u8],
        purpose: &Option<RawEncodePurpose>,
    ) -> Result<&'a mut [u8], BuckyError> {
        let size = self.raw_measure(purpose).unwrap();
        if buf.len() < size {
            return Err(BuckyError::new(
                BuckyErrorCode::OutOfLimit,
                format!("[raw_encode] not enough buffer for RawDataDescContent, except {}, actual {}", size, buf.len()),
            ));
        }

        let buf = self.name.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_encode/name error:{}", e);
            e
        })?;

        let buf = self.create_time.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_encode/create_time error:{}", e);
            e
        })?;
        let buf = self.vec_list.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_encode/vec_list error:{}", e);
            e
        })?;
        let buf = self.hash_set.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_encode/hash_set error:{}", e);
            e
        })?;
        let buf = self.hash_map.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_encode/hash_map error:{}", e);
            e
        })?;
        let buf = self.btree_map.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_encode/btree_map error:{}", e);
            e
        })?;
        let buf = self.btree_set.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataDescContent::raw_encode/btree_set error:{}", e);
            e
        })?;

        Ok(buf)
    }
}

impl<'de> RawDecode<'de> for RawDataDescContent {
    fn raw_decode(buf: &'de [u8]) -> BuckyResult<(Self, &'de [u8])> {
        let (name, buf) = String::raw_decode(buf).map_err(|e| {
            log::error!("RawDataDescContent::raw_decode/name error:{}", e);
            e
        })?;
        let (create_time, buf) = u64::raw_decode(buf).map_err(|e| {
            log::error!("RawDataDescContent::raw_decode/create_time error:{}", e);
            e
        })?;
        let (vec_list, buf) = Vec::<String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataDescContent::raw_decode/vec_list error:{}", e);
            e
        })?;
        let (hash_set, buf) = HashSet::<String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataDescContent::raw_decode/hash_set error:{}", e);
            e
        })?;
        let (hash_map, buf) = HashMap::<String,String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataDescContent::raw_decode/hash_map error:{}", e);
            e
        })?;
        let (btree_map, buf) = BTreeMap::<String,String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataDescContent::raw_decode/btree_map error:{}", e);
            e
        })?;
        let (btree_set, buf) = BTreeSet::<String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataDescContent::raw_decode/btree_set error:{}", e);
            e
        })?;
        Ok((Self { name,create_time,vec_list,hash_set,hash_map,btree_map,btree_set}, buf))
    }
}


impl  RawDataDescContent {
    pub fn show_info(&self) {
        log::info!("Desc name:{}",self.name.clone());
        log::info!("Desc create_time:{}",self.create_time.clone());
    }
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


#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RawDataBodyContent {
    pub name: String,
    pub create_time: u64,
    pub vec_list: Vec<String>,
    pub hash_set: HashSet<String>,
    pub hash_map: HashMap<String,String>,
    pub btree_map: BTreeMap<String,String>,
    pub btree_set: BTreeSet<String>,
}

// body使用protobuf编解码
impl BodyContent for RawDataBodyContent {
    fn format(&self) -> u8 {
        OBJECT_CONTENT_CODEC_FORMAT_PROTOBUF
    }
}

impl std::fmt::Display for RawDataBodyContent {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "RawDataBodyContent:{{name:{:?},create_time:name:{:?}", self.name,self.create_time).map_err(|e| {
            log::error!("RawDataBodyContent::fmt error:{}", e);
            e
        })?;
        write!(f, "}}")
    }
}

impl Default for RawDataBodyContent {
    fn default() -> Self {
        Self {
            name: "test".to_string(),
            create_time:system_time_to_bucky_time(&std::time::SystemTime::now()),
            vec_list: Vec::new(),
            hash_set: HashSet::new(),
            hash_map: HashMap::new(),
            btree_map: BTreeMap::new(),
            btree_set: BTreeSet::new()
        }
    }
}

impl RawDataBodyContent {
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
impl RawEncode for RawDataBodyContent {
    fn raw_measure(&self, purpose: &Option<RawEncodePurpose>) -> Result<usize, BuckyError> {
        let size = 0 + self.name.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_measure name error:{}", e);
            e
        })?  + self.create_time.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_measure create_time error:{}", e);
            e
        })? + self.vec_list.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_measure vec_list error:{}", e);
            e
        })? + self.hash_set.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_measure hash_set error:{}", e);
            e
        })? + self.hash_map.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_measure hash_map error:{}", e);
            e
        })? + self.btree_map.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_measure btree_map error:{}", e);
            e
        })? + self.btree_set.raw_measure(purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_measure btree_set error:{}", e);
            e
        })?;
        Ok(size)
    }

    fn raw_encode<'a>(
        &self,
        buf: &'a mut [u8],
        purpose: &Option<RawEncodePurpose>,
    ) -> Result<&'a mut [u8], BuckyError> {
        let size = self.raw_measure(purpose).unwrap();
        if buf.len() < size {
            return Err(BuckyError::new(
                BuckyErrorCode::OutOfLimit,
                format!("[raw_encode] not enough buffer for RawDataBodyContent, except {}, actual {}", size, buf.len()),
            ));
        }

        let buf = self.name.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_encode/name error:{}", e);
            e
        })?;

        let buf = self.create_time.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_encode/create_time error:{}", e);
            e
        })?;
        let buf = self.vec_list.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_encode/vec_list error:{}", e);
            e
        })?;
        let buf = self.hash_set.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_encode/hash_set error:{}", e);
            e
        })?;
        let buf = self.hash_map.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_encode/hash_map error:{}", e);
            e
        })?;
        let buf = self.btree_map.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_encode/btree_map error:{}", e);
            e
        })?;
        let buf = self.btree_set.raw_encode(buf, purpose).map_err(|e| {
            log::error!("RawDataBodyContent::raw_encode/btree_set error:{}", e);
            e
        })?;

        Ok(buf)
    }
}

impl<'de> RawDecode<'de> for RawDataBodyContent {
    fn raw_decode(buf: &'de [u8]) -> BuckyResult<(Self, &'de [u8])> {
        let (name, buf) = String::raw_decode(buf).map_err(|e| {
            log::error!("RawDataBodyContent::raw_decode/name error:{}", e);
            e
        })?;
        let (create_time, buf) = u64::raw_decode(buf).map_err(|e| {
            log::error!("RawDataBodyContent::raw_decode/create_time error:{}", e);
            e
        })?;
        let (vec_list, buf) = Vec::<String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataBodyContent::raw_decode/vec_list error:{}", e);
            e
        })?;
        let (hash_set, buf) = HashSet::<String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataBodyContent::raw_decode/hash_set error:{}", e);
            e
        })?;
        let (hash_map, buf) = HashMap::<String,String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataBodyContent::raw_decode/hash_map error:{}", e);
            e
        })?;
        let (btree_map, buf) = BTreeMap::<String,String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataBodyContent::raw_decode/btree_map error:{}", e);
            e
        })?;
        let (btree_set, buf) = BTreeSet::<String>::raw_decode(buf).map_err(|e| {
            log::error!("RawDataBodyContent::raw_decode/btree_set error:{}", e);
            e
        })?;
        Ok((Self { name,create_time,vec_list,hash_set,hash_map,btree_map,btree_set}, buf))
    }
}


impl  RawDataBodyContent {
    pub fn show_info(&self) {
        log::info!("Body name:{}",self.name.clone());
        log::info!("Body create_time:{}",self.create_time.clone());
    }
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



pub type RawDataType = NamedObjType<RawDataDescContent, RawDataBodyContent>;
pub type RawDataObjectBuilder = NamedObjectBuilder<RawDataDescContent, RawDataBodyContent>;
pub type RawDataObject = NamedObjectBase<RawDataType>;



pub trait RawData {
    fn new(
        desc: RawStableSortData,
        body: RawStableSortData,
    ) -> Self;
    fn name(&self) -> &str;
    fn create_time(&self) -> u64;
    fn show(&self)->BuckyResult<()>;
}

impl RawData for RawDataObject {
    fn new(
        desc: RawStableSortData,
        body: RawStableSortData,
    ) -> Self {
        let desc = RawDataDescContent {
            name : desc.name,
            create_time: desc.create_time,
            vec_list: desc.vec_list,
            hash_set: desc.hash_set,
            hash_map: desc.hash_map,
            btree_map: desc.btree_map,
            btree_set: desc.btree_set,
        };
        let body = RawDataBodyContent{
            name : body.name,
            create_time: body.create_time,
            vec_list: body.vec_list,
            hash_set: body.hash_set,
            hash_map: body.hash_map,
            btree_map: body.btree_map,
            btree_set: body.btree_set,
        };

        RawDataObjectBuilder::new(desc, body).no_create_time().build()
    }

    fn name(&self) -> &str {
        self.desc().content().name.as_str()
    }

    fn create_time(&self) -> u64 {
        self.desc().content().create_time
    }

    fn show(&self)->BuckyResult<()> {
        let _ = self.desc().content().show_info();
        let _ = self.desc().content().show_btree_map();
        let _ = self.desc().content().show_btree_set();
        let _ = self.desc().content().show_hash_map();
        let _ = self.desc().content().show_hash_set();
        let _ = self.desc().content().show_vec_list();
        let _ = self.body_expect("xx").content().show_info();
        let _ = self.body_expect("xx").content().show_btree_map();
        let _ = self.body_expect("xx").content().show_btree_set();
        let _ = self.body_expect("xx").content().show_hash_map();
        let _ = self.body_expect("xx").content().show_hash_set();
        let _ = self.body_expect("xx").content().show_vec_list();
        Ok(())
    }
}


