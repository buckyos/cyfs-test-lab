# 256 Stable sort for HashSet
    NameObject 数据结构包含desc 和 body部分，NameObject 同时支持 protobuf 和 raw 两种编码方式。
    

## protobuf 编码格式    
protobuf中数据结构 map/repeated 转换成rust语言只支持HashMap/Vec数据类型,要构造HashSet/BTreeMap/BTreeSet 数据类型需要在NameObject定义中再次做数据类型转换，因此protobuf和raw方式定义NameObject 在本次测试中并不存在不同。因此定义了一个StableSortObject NameObject 用于测试

+ proto3
``` proto3
syntax = "proto3";

message StableSortDescContent {
  string name = 1;
  uint64 create_time = 2;
  repeated string vec_list = 3;
  repeated string hash_set = 4;
  map<string, string> hash_map = 5;
  map<string, string> btree_map = 6;
  repeated string btree_set = 7;

}
message StableSortBodyContent {
  string name = 1;
  uint64 create_time = 2;
  repeated string vec_list = 3;
  repeated string hash_set = 4;
  map<string, string> hash_map = 5;
  map<string, string> btree_map = 6;
  repeated string btree_set = 7;
}
```
+ rust
``` rust
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
    #[prost(map="string, string", tag="5")]
    pub hash_map: ::std::collections::HashMap<::prost::alloc::string::String, ::prost::alloc::string::String>,
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
    #[prost(map="string, string", tag="5")]
    pub hash_map: ::std::collections::HashMap<::prost::alloc::string::String, ::prost::alloc::string::String>,
    #[prost(map="string, string", tag="6")]
    pub btree_map: ::std::collections::HashMap<::prost::alloc::string::String, ::prost::alloc::string::String>,
    #[prost(string, repeated, tag="7")]
    pub btree_set: ::prost::alloc::vec::Vec<::prost::alloc::string::String>,
}

```


## raw 编码格式 