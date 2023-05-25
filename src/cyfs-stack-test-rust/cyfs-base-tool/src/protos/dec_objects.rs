#[derive(Clone, PartialEq, ::prost::Message)]
pub struct HashMapData {
    #[prost(string, tag="1")]
    pub key: ::prost::alloc::string::String,
    #[prost(string, tag="2")]
    pub value: ::prost::alloc::string::String,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct StableSortDescContent {
    #[prost(string, tag="1")]
    pub name: ::prost::alloc::string::String,
    #[prost(uint64, tag="2")]
    pub create_time: u64,
    #[prost(string, repeated, tag="3")]
    pub vec_list: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
    #[prost(string, repeated, tag="4")]
    pub hash_set: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
    #[prost(message, repeated, tag="5")]
    pub hash_map: ::prost::alloc::vec::Vec<HashMapData>,
    #[prost(map="string, string", tag="6")]
    pub btree_map: ::std::collections::HashMap<::prost::alloc::string::String, ::prost::alloc::string::String>,
    #[prost(string, repeated, tag="7")]
    pub btree_set: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
}
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct StableSortBodyContent {
    #[prost(string, tag="1")]
    pub name: ::prost::alloc::string::String,
    #[prost(uint64, tag="2")]
    pub create_time: u64,
    #[prost(string, repeated, tag="3")]
    pub vec_list: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
    #[prost(string, repeated, tag="4")]
    pub hash_set: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
    #[prost(message, repeated, tag="5")]
    pub hash_map: ::prost::alloc::vec::Vec<HashMapData>,
    #[prost(map="string, string", tag="6")]
    pub btree_map: ::std::collections::HashMap<::prost::alloc::string::String, ::prost::alloc::string::String>,
    #[prost(string, repeated, tag="7")]
    pub btree_set: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
}
