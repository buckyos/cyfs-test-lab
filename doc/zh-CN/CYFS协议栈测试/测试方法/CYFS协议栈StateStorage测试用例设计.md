## StateStorage测试用例设计

### StateStorage相关接口:
* SharedCyfsStack::StateStorageMap::storage
* SharedCyfsStack::StateStorageMap::save
* SharedCyfsStack::StateStorageMap::abort
* SharedCyfsStack::StateStorageMap::get
* SharedCyfsStack::StateStorageMap::set
* SharedCyfsStack::StateStorageMap::set_ex
* SharedCyfsStack::StateStorageMap::insert
* SharedCyfsStack::StateStorageMap::remove
* SharedCyfsStack::StateStorageMap::remove_ex
* SharedCyfsStack::StateStorageMap::next
* SharedCyfsStack::StateStorageMap::reset
* SharedCyfsStack::StateStorageMap::list
* SharedCyfsStack::StateStorageMap::convert_list
* SharedCyfsStack::StateStorageSet::storage
* SharedCyfsStack::StateStorageSet::save
* SharedCyfsStack::StateStorageSet::abort
* SharedCyfsStack::StateStorageSet::contains
* SharedCyfsStack::StateStorageSet::insert
* SharedCyfsStack::StateStorageSet::remove
* SharedCyfsStack::StateStorageSet::next
* SharedCyfsStack::StateStorageSet::reset
* SharedCyfsStack::StateStorageSet::list
* SharedCyfsStack::StateStorageSet::convert_list

## 测试点
#### 环境类型
* dec_app真机环境
* 模拟器环境

#### 必填项
* 必填
* 非必填

#### 助记词
* 长度12的英文字符串

#### 设备类型
* OOD
* Device

#### 密钥类型
* people
* device

#### 密钥数量
* 1
* n

#### 密码类型
* 固定
* 随机

## 测试用例设计
* state_storage 测试执行,StateStorageMap 接口测试,function storage,storage_Map_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function storage，storage_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function storage，storage_Set_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function storage，storage_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function save，storage_Map_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function save，storage_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function save，storage_Set_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function save，storage_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function save，save_Map_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function save，save_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function save，save_Set_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function save，save_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function abort，abort_Map_RootState  正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function abort，abort_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function abort，abort_Set_RootState  正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function abort，abort_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function get，get_Map_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function get，get_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function get，get_Set_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function get，get_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function set，set_Map_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function set，set_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function set，set_Set_RootState 正常调用
* tate_storage 测试执行,StateStorageMap 接口测试,function set，set_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function set_ex，set_ex_Map_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function set_ex，set_ex_Map_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function set_ex，set_ex_Set_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function set_ex，set_ex_Set_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function insert，insert_Map_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function insert，insert_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function insert，insert_Set_RootState 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function insert，insert_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function remove，remove_Map_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function remove，remove_Map_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function remove，remove_Set_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function remove，remove_Set_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function next，next_Map_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function next，next_Map_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function next，next_Set_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function next，next_Set_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function reset，reset_Map_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function reset，reset_Map_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function reset，reset_Set_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function reset，reset_Set_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function list，list_Map_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function list，list_Map_LocalCache正常调用
* tate_storage 测试执行,StateStorageMap 接口测试,function list，list_Set_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function list，list_Set_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function convert_list，convert_list_Map_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function convert_list，convert_list_Map_LocalCache正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function convert_list，convert_list_Set_RootState正常调用
* state_storage 测试执行,StateStorageMap 接口测试,function convert_list，convert_list_Set_LocalCache正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function storage,storage_Map_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function storage,storage_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function storage,storage_Set_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function storage,storage_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function save,save_Map_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function save,save_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function save,save_Set_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function save,save_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function abort,contains_Map_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function abort,contains_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function abort,contains_Set_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function abort,contains_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function insert,insert_Map_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function insert,insert_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function insert,insert_Set_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function insert,insert_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function remove,remove_Map_RootState正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function remove,remove_Map_LocalCache正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function remove,remove_Set_RootState正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function remove,remove_Set_LocalCache正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function next,next_Map_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function next,next_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function next,next_Set_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function next,next_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function reset,reset_Map_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function reset,reset_Map_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function reset,reset_Set_RootState 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function reset,reset_Set_LocalCache 正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function list,list_Map_RootState正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function list,list_Map_LocalCache正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function list,list_Set_RootState正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function list,list_Set_LocalCache正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function convert_list,convert_list_Map_RootState正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function convert_list,convert_list_Map_LocalCache正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function convert_list,convert_list_Set_RootState正常调用
* state_storage 测试执行,StateStorageSet 接口测试,function convert_list,convert_list_Set_LocalCache正常调用
