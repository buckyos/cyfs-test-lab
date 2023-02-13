# CYFS Stack NDN文件传输

+ NDN 模块
+ Trans 模块

# CYFS Stack NDN相关 API

## Trans 模块

### TransOutputProcessor 定义

``` rust
#[async_trait::async_trait]
pub trait TransOutputProcessor: Send + Sync {
    async fn get_context(&self, req: TransGetContextOutputRequest) -> BuckyResult<TransGetContextOutputResponse>;
    async fn put_context(&self, req: TransPutContextOutputRequest) -> BuckyResult<()>;
    async fn create_task(
        &self,
        req: TransCreateTaskOutputRequest,
    ) -> BuckyResult<TransCreateTaskOutputResponse>;
    async fn control_task(&self, req: TransControlTaskOutputRequest) -> BuckyResult<()>;
    async fn query_tasks(
        &self,
        req: TransQueryTasksOutputRequest,
    ) -> BuckyResult<TransQueryTasksOutputResponse>;
    async fn get_task_state(
        &self,
        req: TransGetTaskStateOutputRequest,
    ) -> BuckyResult<TransGetTaskStateOutputResponse>;
    async fn publish_file(
        &self,
        req: TransPublishFileOutputRequest,
    ) -> BuckyResult<TransPublishFileOutputResponse>;

    // task group
    async fn get_task_group_state(
        &self,
        req: TransGetTaskGroupStateOutputRequest,
    ) -> BuckyResult<TransGetTaskGroupStateOutputResponse>;
    async fn control_task_group(
        &self,
        req: TransControlTaskGroupOutputRequest,
    ) -> BuckyResult<TransControlTaskGroupOutputResponse>;
}
```

### TransOutputProcessor 接口功能

+ get_context : 从协议栈获取context对象

``` rust
// async fn get_context(&self, req: TransGetContextOutputRequest) -> BuckyResult<TransGetContextOutputResponse>;
//请求参数 TransGetContextOutputRequest
pub struct TransGetContextOutputRequest {
    pub common: NDNOutputRequestCommon,
    // get TransContext object by object id
    pub context_id: Option<ObjectId>,
    // get TransContext object by context_path excatly
    pub context_path: Option<String>,
}
//返回结果 TransGetContextOutputResponse
pub struct TransGetContextOutputResponse {
    pub context: TransContext,
}
```

+ put_context : 更新协议栈context对象

``` rust
//async fn put_context(&self, req: TransPutContextOutputRequest) -> BuckyResult<()>;
//请求参数 TransPutContextOutputRequest
pub struct TransPutContextOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub context: TransContext,
    pub access: Option<AccessString>, // 权限配置
}
```

+ create_task : 创建文件下载任务

```rust
//async fn create_task(&self,req: TransCreateTaskOutputRequest) -> BuckyResult<TransCreateTaskOutputResponse>;
//请求参数 TransCreateTaskOutputRequest
pub struct TransCreateTaskOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub object_id: ObjectId,
    // 保存到的本地目录or文件
    pub local_path: PathBuf,
    pub device_list: Vec<DeviceId>, // 下载源列表
    pub group: Option<String>, //设置传输组
    pub context: Option<String>, //设置context
    // 任务创建完成之后自动启动任务
    pub auto_start: bool,
}
//返回结果 TransCreateTaskOutputResponse
pub struct TransCreateTaskOutputResponse {
    pub task_id: String,
}
```

+ control_task : 传输任务调度控制 Start/Stop/Delete

``` rust
// async fn control_task(&self, req: TransControlTaskOutputRequest) -> BuckyResult<()>;
//请求参数 TransControlTaskOutputRequest
pub struct TransControlTaskOutputRequest {
    // 用以处理acl
    pub common: NDNOutputRequestCommon,
    pub task_id: String,
    pub action: TransTaskControlAction,
}
pub enum TransTaskControlAction {
    Start,
    Stop,
    Delete,
}
```

+ query_tasks : 模糊查询协议栈当前传输任务列表

``` rust
// async fn query_tasks(&self,req: TransQueryTasksOutputRequest,) -> BuckyResult<TransQueryTasksOutputResponse>
//请求参数 TransQueryTasksOutputRequest
pub struct TransQueryTasksOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub task_status: Option<TransTaskStatus>,
    pub range: Option<(u64, u32)>, // 分页查询参数 limit 
}
pub enum TransTaskStatus {
    Stopped,
    Running,
    Finished,
    Failed,
}
//返回结果 TransQueryTasksOutputResponse
pub struct TransQueryTasksOutputResponse {
    pub task_list: Vec<TransTaskInfo>,
}
pub struct TransTaskInfo {
    pub task_id: String,
    pub context: Option<String>,
    pub object_id: ObjectId,
    pub local_path: PathBuf,
    pub device_list: Vec<DeviceId>,
}
```

+ get_task_state : 获取传输任务状态

``` rust
// async fn get_task_state(&self,req: TransGetTaskStateOutputRequest,) -> BuckyResult<TransGetTaskStateOutputResponse>
//请求参数 TransQueryTasksOutputRequest
pub struct TransGetTaskStateOutputRequest {
    // 用以处理acl
    pub common: NDNOutputRequestCommon,
    pub task_id: String,
}
//返回结果 TransGetTaskStateOutputResponse
pub struct TransGetTaskStateOutputResponse {
    pub state: TransTaskState,
    pub group: Option<String>,
}
pub enum TransTaskState {
    Pending,
    Downloading(TransTaskOnAirState),
    Paused,
    Canceled,
    Finished(u32 /*upload_speed*/),
    Err(BuckyErrorCode),
}
```

+ publish_file : 上传文件

``` rust
// async fn publish_file(&self,req: TransPublishFileOutputRequest,) -> BuckyResult<TransPublishFileOutputResponse>
//请求参数 TransPublishFileOutputRequest
pub struct TransPublishFileOutputRequest {
    // 用以处理acl
    pub common: NDNOutputRequestCommon,
    // 文件所属者
    pub owner: ObjectId,
    // 文件的本地路径
    pub local_path: PathBuf,
    // chunk大小
    pub chunk_size: u32,
    // 需要发布的文件对象ID，如果设置，内部不再计算文件对象
    pub file_id: Option<ObjectId>,
    // 关联的dirs
    pub dirs: Option<Vec<FileDirRef>>,
}
//返回结果 TransGetTaskStateOutputResponse
pub struct TransGetTaskStateOutputResponse {
    pub file_id: ObjectId,
}
```

+ get_task_group_state : 获取传输组任务状态

``` rust
//async fn get_task_group_state(&self,req: TransGetTaskGroupStateOutputRequest,) -> BuckyResult<TransGetTaskGroupStateOutputResponse>
//请求参数 TransGetTaskGroupStateOutputRequest
pub struct TransGetTaskGroupStateOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub group: String,
    pub speed_when: Option<u64>,
}
//返回结果 TransGetTaskGroupStateOutputResponse
pub struct TransGetTaskGroupStateOutputResponse {
    pub state: DownloadTaskState,
    pub control_state: DownloadTaskControlState,
    pub speed: Option<u32>,
    pub cur_speed: u32,
    pub history_speed: u32,
}

pub enum DownloadTaskState {
    Downloading(u32/*速度*/, f32/*进度*/),
    Paused,
    Error(BuckyError/*被cancel的原因*/), 
    Finished
}

pub enum DownloadTaskControlState {
    Normal, 
    Paused, 
    Canceled, 
}
```

+ control_task_group : 传输组控制

``` rust
// async fn control_task_group(&self,req: TransControlTaskGroupOutputRequest,) -> BuckyResult<TransControlTaskGroupOutputResponse>
//请求参数 TransControlTaskGroupOutputRequest
pub struct TransControlTaskGroupOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub group: String,
    pub action: TransTaskGroupControlAction,
}
pub enum TransTaskGroupControlAction {
    Resume,
    Cancel,
    Pause,
}
//返回结果 TransControlTaskGroupOutputResponse
pub struct TransControlTaskGroupOutputResponse {
    pub control_state: DownloadTaskControlState,
}
pub enum DownloadTaskControlState {
    Normal, 
    Paused, 
    Canceled, 
}
```

## NDN 模块

### NDNOutputProcessor 定义

``` rust
#[async_trait::async_trait]
pub trait NDNOutputProcessor: Sync + Send + 'static {
    async fn put_data(&self, req: NDNPutDataOutputRequest)
        -> BuckyResult<NDNPutDataOutputResponse>;

    async fn get_data(&self, req: NDNGetDataOutputRequest)
        -> BuckyResult<NDNGetDataOutputResponse>;

    async fn put_shared_data(&self, req: NDNPutDataOutputRequest)
                      -> BuckyResult<NDNPutDataOutputResponse>;

    async fn get_shared_data(&self, req: NDNGetDataOutputRequest)
                      -> BuckyResult<NDNGetDataOutputResponse>;

    async fn delete_data(
        &self,
        req: NDNDeleteDataOutputRequest,
    ) -> BuckyResult<NDNDeleteDataOutputResponse>;

    async fn query_file(
        &self,
        req: NDNQueryFileOutputRequest,
    ) -> BuckyResult<NDNQueryFileOutputResponse>;
}
```

### NDNOutputProcessor 接口

+ put_data : ndn向目标设备发送数据

``` rust
// async fn put_data(&self, req: NDNPutDataOutputRequest)-> BuckyResult<NDNPutDataOutputResponse>;
//请求参数 NDNPutDataOutputRequest
pub struct NDNPutDataOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub object_id: ObjectId,
    pub length: u64,
    pub data: Box<dyn Read + Unpin + Send + Sync + 'static>,
}
//返回结果 NDNPutDataOutputResponse
pub struct NDNPutDataOutputResponse {
    pub result: NDNPutDataResult,
}
pub enum NDNPutDataResult {
    Accept,
    AlreadyExists,
}
```

+ get_data : ndn从目标设备获取数据

```rust
// async fn get_data(&self, req: NDNGetDataOutputRequest)-> BuckyResult<NDNGetDataOutputResponse>;
//请求参数 NDNGetDataOutputRequest
/*
支持三种形式:
chunk_id
file_id
dir_id|object_map + inner_path
*/
pub struct NDNGetDataOutputRequest {
    pub common: NDNOutputRequestCommon,
    // 目前只支持ChunkId/FileId/DirId
    pub object_id: ObjectId,
    pub range: Option<NDNDataRequestRange>,
    // 对dir_id有效
    pub inner_path: Option<String>,
    // get data from context instead of common.target
    pub context: Option<String>,
    // trans data task's group
    pub group: Option<String>,
}
//返回结果 NDNGetDataOutputResponse
pub struct NDNGetDataOutputResponse {
    // chunk_id/file_id
    pub object_id: ObjectId,
    // file's owner
    pub owner_id: Option<ObjectId>,
    // 所属file的attr
    pub attr: Option<Attributes>,
    // resp ranges
    pub range: Option<NDNDataResponseRange>,
    // task group
    pub group: Option<String>,
    // content
    pub length: u64,
    pub data: Box<dyn Read + Unpin + Send + Sync + 'static>,
}
```

+ put_shared_data

```rust
//async fn put_shared_data(&self, req: NDNPutDataOutputRequest)-> BuckyResult<NDNPutDataOutputResponse>;
//请求参数 NDNPutDataOutputRequest
pub struct NDNPutDataOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub object_id: ObjectId,
    pub length: u64,
    pub data: Box<dyn Read + Unpin + Send + Sync + 'static>,
}
//返回结果 NDNPutDataOutputResponse
pub struct NDNPutDataOutputResponse {
    pub result: NDNPutDataResult,
}
```

+ get_shared_data

```rust
// async fn get_shared_data(&self, req: NDNGetDataOutputRequest)-> BuckyResult<NDNGetDataOutputResponse>;
//请求参数 NDNGetDataOutputRequest
/*
支持三种形式:
chunk_id
file_id
dir_id|object_map + inner_path
*/
pub struct NDNGetDataOutputRequest {
    pub common: NDNOutputRequestCommon,
    // 目前只支持ChunkId/FileId/DirId
    pub object_id: ObjectId,
    pub range: Option<NDNDataRequestRange>,
    // 对dir_id有效
    pub inner_path: Option<String>,
    // get data from context instead of common.target
    pub context: Option<String>,
    // trans data task's group
    pub group: Option<String>,
}
//返回结果 NDNGetDataOutputResponse
pub struct NDNGetDataOutputResponse {
    // chunk_id/file_id
    pub object_id: ObjectId,
    // file's owner
    pub owner_id: Option<ObjectId>,
    // 所属file的attr
    pub attr: Option<Attributes>,
    // resp ranges
    pub range: Option<NDNDataResponseRange>,
    // task group
    pub group: Option<String>,
    // content
    pub length: u64,
    pub data: Box<dyn Read + Unpin + Send + Sync + 'static>,
}
```

+ delete_data

``` rust
// async fn delete_data(&self,req: NDNDeleteDataOutputRequest,) -> BuckyResult<NDNDeleteDataOutputResponse>;
//请求参数 NDNDeleteDataOutputRequest
pub struct NDNDeleteDataOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub object_id: ObjectId,
    // 对dir_id有效
    pub inner_path: Option<String>,
}
//返回结果 NDNDeleteDataOutputResponse
pub struct NDNDeleteDataOutputResponse {
    pub object_id: ObjectId,
}
```

+ query_file

```rust
// async fn query_file(&self,req: NDNQueryFileOutputRequest,) -> BuckyResult<NDNQueryFileOutputResponse>;
//请求参数 NDNQueryFileOutputRequest
pub struct NDNQueryFileOutputRequest {
    pub common: NDNOutputRequestCommon,
    pub param: NDNQueryFileParam,
}
//返回结果 NDNQueryFileOutputResponse
pub struct NDNQueryFileInputResponse {
    pub list: Vec<NDNQueryFileInfo>,
}
pub struct NDNQueryFileInfo {
    pub file_id: FileId,
    pub hash: String,
    pub length: u64,
    pub flags: u32,
    pub owner: Option<ObjectId>,
    // 可选，关联的quickhash
    pub quick_hash: Option<Vec<String>>,
    // 可选，关联的dirs
    pub ref_dirs: Option<Vec<FileDirRef>>,
}
pub enum NDNQueryFileParam {
    File(ObjectId),
    Hash(HashValue),
    QuickHash(String),
    Chunk(ChunkId),
}
```


# 测试用例设计

## 冒烟测试

## 