## cyfs_bdt::Stack
``` rust
pub struct StackImpl {
    config: StackConfig,
    local_device_id: DeviceId,
    local_const: DeviceDesc,
    id_generator: IncreaseIdGenerator,
    keystore: keystore::Keystore,
    device_cache: DeviceCache,
    net_manager: NetManager,
    lazy_components: Option<StackLazyComponents>, 
    ndn: Option<NdnStack>, 
}
```
### cyfs_bdt::StackLazyComponents
``` rust
struct StackLazyComponents {
    sn_client: sn::client::ClientManager,
    tunnel_manager: TunnelManager,
    stream_manager: StreamManager,
    datagram_manager: DatagramManager,
    proxy_manager: ProxyManager, 
    debug_stub: Option<DebugStub>
}
```
#### sn::client::ClientManager 
+ SN ClientManager 定义:
``` rust
pub struct ClientManager {
    ping: PingManager,
    call: CallManager,
}
```

+ impl ClientManager
    + pub fn create(stack: WeakStack) -> ClientManager
    + pub fn reset(&self)
    + pub fn sn_list(&self) -> Vec<DeviceId>
    + pub fn status_of(&self, sn: &DeviceId) -> Option<SnStatus> 
    + pub fn start_ping(&self)
    + pub fn stop_ping(&self) -> Result<(), BuckyError> 
    + pub fn add_sn_ping(&self, desc: &Device, is_encrypto: bool, appraiser: Option<Box<dyn ServiceAppraiser>>)
    + pub fn remove_sn_ping(&self, sn_peerid: &DeviceId) -> Result<(), BuckyError>
    + pub fn call(&self,reverse_endpoints: &[Endpoint],remote_peerid: &DeviceId,sn: &Device,is_always_call: bool,is_encrypto: bool,with_local: bool,payload_generater: impl Fn(&SnCall) -> Vec<u8>) -> impl Future<Output = Result<Device, BuckyError>> 
    + pub fn resend_ping(&self)




#### StreamManager
+ StreamManager 定义
```
pub struct StreamManagerImpl {
    stack: WeakStack, 
    stream_entries: RwLock<StreamContainerEntries>, 
    acceptor_entries: RwLock<BTreeMap<u16, StreamListener>>
}
```
+ impl StreamManager
    + pub fn new(stack: WeakStack) -> Self
    + pub async fn connect(&self, port: u16, question: Vec<u8>, build_params: BuildTunnelParams) -> Result<StreamGuard, BuckyError>
    + pub fn listen(&self, port: u16) -> Result<StreamListenerGuard, BuckyError> 
    + pub fn stream_of_remote_sequence(&self, rs: &RemoteSequence) -> Option<StreamContainer>
    + pub fn remove_stream(&self, stream: &StreamContainer)

+ StreamGuard 定义
```rust
pub struct StreamGuard(Arc<StreamGuardImpl>);
struct StreamGuardImpl(StreamContainer);
pub struct StreamContainer(Arc<StreamContainerImpl>);
pub struct StreamContainerImpl {
    stack: WeakStack,
    tunnel: TunnelGuard,
    remote_port: u16,
    local_id: IncreaseId,
    sequence: TempSeq,
    state: RwLock<StreamStateImpl>,
    answer_data: RwLock<Option<Vec<u8>>>,
}
```
+ StreamGuard 接口
    + pub async fn write_all(data: &[u8]) //Stream 写入数据
    + pub async fn read(buf: mut &[u8]) //Stream 读取数据

+ StreamListenerGuard 定义
```
pub struct StreamListenerGuard(Arc<StreamListenerGuardImpl>);
struct StreamListenerGuardImpl(StreamListener);
pub struct StreamListener(Arc<StreamListenerImpl>);
```
+ impl StreamListener
    + pub fn new(manager: WeakStreamManager, port: u16, backlog: usize) -> Self 
    + pub fn port(&self) -> u16 
    + pub async fn accept(&self) -> Option<Result<PreAcceptedStream, BuckyError>>
    + pub fn incoming(&self) -> StreamIncoming<'_> 
    + pub fn stop(&self)

+ StreamContainer 定义
```
pub struct StreamContainer(Arc<StreamContainerImpl>);
pub struct StreamContainerImpl {
    stack: WeakStack,
    tunnel: TunnelGuard,
    remote_port: u16,
    local_id: IncreaseId,
    sequence: TempSeq,
    state: RwLock<StreamStateImpl>,
    answer_data: RwLock<Option<Vec<u8>>>,
}
```
+ impl StreamContainer
    + pub async fn confirm(&self, answer: &[u8]) -> Result<(), BuckyError>
    + pub fn shutdown(&self, which: Shutdown) -> Result<(), std::io::Error> 
    + pub fn readable(&self) -> StreamReadableFuture
    + pub fn remote(&self) -> (&DeviceId, u16) 
    + pub fn sequence(&self) -> TempSeq 
    + pub fn state(&self) -> StreamState 
    + pub fn local_id(&self) -> IncreaseId 
    + pub fn local_ep(&self) -> Option<Endpoint>
    + pub fn remote_ep(&self) -> Option<Endpoint> 

+ impl StreamContainerImpl
    + pub fn new(weak_stack: WeakStack,tunnel: TunnelGuard,remote_port: u16,local_id: IncreaseId,sequence: TempSeq,) -> StreamContainer
    + pub fn accept(&self, arc_self: &StreamContainer, remote_id: IncreaseId) 
    + pub async fn connect(&self,arc_self: &StreamContainer,question: Vec<u8>,build_params: BuildTunnelParams,) -> Result<(), BuckyError>
    + pub async fn establish_with(&self,selector: StreamProviderSelector,arc_self: &StreamContainer,) -> Result<(), BuckyError> 
    + pub fn cancel_connecting_with(&self, err: &BuckyError) -> Result<(), BuckyError> 
    + pub async fn wait_establish(&self) -> Result<(), BuckyError> 
    + pub fn syn_session_data(&self) -> Option<SessionData> 
    + pub fn syn_ack_session_data(&self, answer: &[u8]) -> Option<SessionData> 
    + pub fn syn_tcp_stream(&self) -> Option<TcpSynConnection>
    + pub fn ack_tcp_stream(&self, answer: &[u8]) -> Option<TcpAckConnection>
    + pub fn ack_ack_tcp_stream(&self, result: u8) -> TcpAckAckConnection
    + pub fn tunnel(&self) -> &TunnelContainer
    + pub fn state(&self) -> StreamState 
    + pub fn is_connecting(&self) -> bool
    + pub fn acceptor(&self) -> Option<AcceptStreamBuilder> 
    + pub fn stack(&self) -> Stack
    + pub fn break_with_error(&self, arc_self: &StreamContainer, err: BuckyError)
    + pub fn on_shutdown(&self, arc_self: &StreamContainer)

#### DatagramManager
+ DatagramManager 定义
```rust
pub struct DatagramManager(Arc<DatagramManagerImpl>);
struct DatagramManagerImpl {
    stack: WeakStack,
    cfg: Config,
    tunnels: RwLock<BTreeMap<u16, DatagramTunnel>>
}
```
+ impl DatagramManager 
    + pub fn new(stack: WeakStack) -> DatagramManager
    + pub fn bind(&self, vport: u16) -> Result<DatagramTunnelGuard, BuckyError>
    + pub fn stack(&self) -> Stack
+ DatagramTunnel 定义
```
pub struct DatagramTunnel(Arc<DatagramTunnelImpl>);
struct DatagramTunnelImpl {
    stack: WeakStack,
    sequence: TempSeqGenerator,
    vport: u16,
    recv_buffer: Mutex<RecvBuffer>,
    frag_buffer: Arc<Mutex<DatagramFragments>>,
}
```
+ impl DatagramTunnel
    + pub(crate) fn new(stack: WeakStack, vport: u16, recv_buffer: usize) -> DatagramTunnel
    + pub fn recv_v(&self) -> impl Future<Output = Result<LinkedList<Datagram>, std::io::Error>>
    + pub fn measure_data(&self, _options: &DatagramOptions) -> BuckyResult<usize>
    + pub fn send_to_v(&self,_buf: &[&[u8]],_options: &DatagramOptions,_remote: &DeviceId,_vport: u16,) -> Result<(), std::io::Error>
    + pub fn send_to(&self,buf: &[u8],options: &mut DatagramOptions,remote: &DeviceId,vport: u16,) -> Result<(), std::io::Error>
    + pub fn vport(&self) -> u16 
    + pub fn close(&self) 

#### ProxyManager
+ ProxyManager
```
pub struct ProxyManager {
    stack: WeakStack,
    proxies: RwLock<Proxies>
} 
struct Proxies {
    active_proxies: BTreeSet<DeviceId>,
    passive_proxies: BTreeSet<DeviceId>,
    dump_proxies: BTreeSet<DeviceId>,
}
```
+ impl ProxyManager 
    + pub(crate) fn new(stack: WeakStack) -> Self 
    + pub fn add_active_proxy(&self, proxy: &Device)
    + pub fn remove_active_proxy(&self, proxy: &DeviceId) -> bool 
    + pub fn active_proxies(&self) -> Vec<DeviceId>
    + pub fn add_passive_proxy(&self, proxy: &Device)
    + pub fn remove_passive_proxy(&self, proxy: &DeviceId) -> bool
    + pub fn passive_proxies(&self) -> Vec<DeviceId> 
    + pub fn add_dump_proxy(&self, proxy: &Device) 
    + pub fn remove_dump_proxy(&self, proxy: &DeviceId) -> bool 
    + pub fn dump_proxies(&self) -> Vec<DeviceId>
    + pub async fn sync_passive_proxies(&self) 

#### DebugStub
```
pub struct DebugStub(Arc<DebugStubImpl>);
struct DebugStubImpl {
    stack: WeakStack, 
    listener: TcpListener,
}
```
+ impl DebugStub 
    + pub async fn open(weak_stack: WeakStack) -> BuckyResult<Self>
    + pub fn listen(&self) 
    + async fn handle_command(&self, command: String, tunnel: TcpStream)
    + async fn test(&self, tunnel: TcpStream) -> Result<(), String>
    + async fn sn_conn_status(&self, tunnel: TcpStream, command: DebugCommandSnConnStatus) -> Result<(), String>
    + async fn ping(&self, tunnel: TcpStream, command: DebugCommandPing) -> Result<(), String> 
    + async fn bench_datagram(&self, tunnel: TcpStream, command: DebugCommandBenchDatagram) -> Result<(), String> 
    + async fn nc(&self, tunnel: TcpStream, command: DebugCommandNc) -> Result<(), String>
    + async fn get_chunk(&self, tunnel: TcpStream, command: DebugCommandGetChunk) -> Result<(), String> 
    + async fn get_file(&self, tunnel: TcpStream, command: DebugCommandGetFile) -> Result<(), String> 




### net_manager
+ NetManager
```rust
pub struct NetManager {
    listener: RwLock<NetListener>
}

```
+ impl NetManager
    + pub fn open(local: DeviceId,config: &Config,endpoints: &[Endpoint], tcp_port_mapping: Option<Vec<(Endpoint, u16)>>) -> Result<Self, BuckyError> 
    + pub fn reset(&self, endpoints: &[Endpoint]) -> BuckyResult<NetListener>
    + pub fn listener(&self) -> NetListener

+ NetListener
``` rust
pub struct NetListener(Arc<NetListenerImpl>);
struct NetListenerImpl {
    local: DeviceId, 
    udp: Vec<udp::Interface>, 
    tcp: Vec<tcp::Listener>, 
    ip_set: BTreeSet<IpAddr>, 
    ep_set: BTreeSet<Endpoint>, 
    state: RwLock<NetListenerState>
}
```
+ impl NetListener
    + pub fn open(local: DeviceId,config: &Config, endpoints: &[Endpoint], tcp_port_mapping: Option<Vec<(Endpoint, u16)>>) -> Result<Self, BuckyError>
    + pub fn reset(&self, endpoints: &[Endpoint]) -> BuckyResult<Self>
    + pub fn start(&self, stack: WeakStack)
    + pub async fn wait_online(&self) -> BuckyResult<()>
    + pub fn close(&self) 
    + pub fn update_outer(&self, ep: &Endpoint, outer: &Endpoint) -> UpdateOuterResult 
    + pub fn endpoints(&self) -> BTreeSet<Endpoint>
    + pub fn udp_of(&self, ep: &Endpoint) -> Option<&udp::Interface>
    + pub fn udp(&self) -> &Vec<udp::Interface>
    + pub fn tcp(&self) -> &Vec<tcp::Listener>
    + pub fn ep_set(&self) -> &BTreeSet<Endpoint>
    + pub fn ip_set(&self) -> &BTreeSet<IpAddr>

### NdnStack
``` rust
pub struct NdnStack(Arc<StackImpl>);
struct StackImpl {
    stack: WeakStack, 
    last_schedule: AtomicU64, 
    chunk_manager: ChunkManager, 
    channel_manager: ChannelManager, 
    event_handler: Box<dyn NdnEventHandler>, 
    root_task: RootTask,
}
pub struct NdnStack(Arc<StackImpl>);
```
+ impl NdnStack
    + pub(crate) fn open(stack: WeakStack, ndc: Option<Box<dyn NamedDataCache>>,tracker: Option<Box<dyn TrackerCache>>, store: Option<Box<dyn ChunkReader>>, event_handler: Option<Box<dyn NdnEventHandler>>, ) -> Self 
    + pub(crate) fn start(&self)
    + pub fn chunk_manager(&self) -> &ChunkManager
    + pub fn root_task(&self) -> &RootTask
    + pub fn channel_manager(&self) -> &ChannelManager
    + pub(super) fn event_handler(&self) -> &dyn NdnEventHandler

+ ChunkManager
```
pub struct ChunkManager {
    stack: WeakStack, 
    ndc: Box<dyn NamedDataCache>, 
    tracker: Box<dyn TrackerCache>, 
    store: Box<dyn ChunkReader>, 
    gen_session_id: TempSeqGenerator, 
    views: RwLock<BTreeMap<ChunkId, ChunkView>>, 
}
```
+ impl ChunkManager 
    + pub(crate) fn new(weak_stack: WeakStack, ndc: Box<dyn NamedDataCache>, tracker: Box<dyn TrackerCache>, store: Box<dyn ChunkReader>) -> Self
    + pub async fn track_chunk(&self, chunk: &ChunkId) -> BuckyResult<()> 
    + pub async fn track_file(&self, file: &File) -> BuckyResult<()>
    + pub fn ndc(&self) -> &dyn NamedDataCache
    + pub fn tracker(&self) -> &dyn TrackerCache
    + pub fn store(&self) -> &dyn ChunkReader
    + pub fn view_of(&self, chunk: &ChunkId) -> Option<ChunkView>
    + async fn create_view(&self, chunk: ChunkId, init_state: ChunkState) -> BuckyResult<ChunkView> 
    + pub(crate) async fn start_download(&self, chunk: ChunkId, context: SingleDownloadContext) -> BuckyResult<ChunkDownloader> 
    + pub(crate) async fn start_upload(&self, session_id: TempSeq, chunk: ChunkId, piece_type: ChunkEncodeDesc, to: Channel, ) -> BuckyResult<UploadSession> 
    + pub(super) fn gen_session_id(&self) -> TempSeq
    + pub fn on_schedule(&self, now: Timestamp) 


+ ChannelManager
``` rust
pub struct ChannelManager(Arc<ManagerImpl>);
struct ManagerImpl {
    stack: WeakStack, 
    command_tunnel: DatagramTunnelGuard, 
    channels: RwLock<Channels>
}
struct Channels {
    download_history_speed: HistorySpeed, 
    download_cur_speed: u32, 
    upload_history_speed: HistorySpeed, 
    upload_cur_speed: u32, 
    entries: BTreeMap<DeviceId, Channel>, 
}
```
+ impl ChannelManager
    + pub fn new(weak_stack: WeakStack) -> Self
    + pub fn channel_of(&self, remote: &DeviceId) -> Option<Channel>
    + pub fn create_channel(&self, remote: &DeviceId) -> Channel
    + pub fn on_schedule(&self, when: Timestamp)
    + pub(crate) fn on_time_escape(&self, now: Timestamp)
    + async fn recv_command(&self) 

+ Channel
``` rust
pub struct Channel(Arc<ChannelImpl>);
struct ChannelImpl {
    config: Config, 
    stack: WeakStack, 
    remote: DeviceId, 
    command_tunnel: DatagramTunnelGuard, 
    command_seq: TempSeqGenerator,  
    downloaders: Downloaders, 
    uploaders: Uploaders, 
    state: RwLock<StateImpl>, 
}
```
+ impl Channel 
    + pub fn new(weak_stack: WeakStack, remote: DeviceId, command_tunnel: DatagramTunnelGuard, initial_download_speed: HistorySpeed, initial_upload_speed:HistorySpeed ) -> Self 
    + pub fn reset(&self)
    + pub fn remote(&self) -> &DeviceId
    + pub fn config(&self) -> &Config
    + pub fn upload(&self, session: UploadSession) -> BuckyResult<()>
    + pub fn download(&self, session: DownloadSession) -> BuckyResult<()>
    + pub(super) fn gen_command_seq(&self) -> TempSeq
    + pub fn interest(&self, interest: Interest)
    + pub fn resp_interest(&self, resp: RespInterest)
    + pub(super) fn send_piece_control(&self, control: PieceControl)
    + pub(super) fn on_datagram(&self, datagram: Datagram) -> BuckyResult<()>
    + pub fn stack(&self) -> Stack
    + pub fn state(&self) -> ChannelState
    + pub fn clear_dead(&self)
    + pub fn calc_speed(&self, when: Timestamp) -> (u32, u32)
    + pub fn download_session_count(&self) -> u32
    + pub fn initial_download_session_speed(&self) -> u32
    + pub fn download_cur_speed(&self) -> u32
    + pub fn download_history_speed(&self) -> u32
    + pub fn upload_session_count(&self) -> u32
    + pub fn upload_cur_speed(&self) -> u32 
    + pub fn upload_history_speed(&self) -> u32 

+ RootTask
``` rust
pub struct RootTask(Arc<RootTaskImpl>);
struct RootTaskImpl {
    max_download_speed: u32, 
    download: DownloadGroup, 
    upload: UploadGroup
}
```
+ impl RootTask
    + pub fn new(max_download_speed: u32, history_speed: HistorySpeedConfig) -> Self
    + pub fn upload(&self) -> &UploadGroup 
    + pub fn download(&self) -> &DownloadGroup
    + pub fn on_schedule(&self, now: Timestamp)

+ DownloadGroup 
``` rust
pub struct DownloadGroup(Arc<TaskImpl>);
struct StateImpl {
    entries: HashMap<String, Box<dyn DownloadTask>>, 
    running: Vec<Box<dyn DownloadTask>>, 
    history_speed: HistorySpeed, 
    drain_score: i64, 
    control_state: DownloadTaskControlState
}

struct TaskImpl {
    context: SingleDownloadContext, 
    priority: DownloadTaskPriority, 
    state: RwLock<StateImpl>
}
impl DownloadTask for DownloadGroup
```
+ impl DownloadGroup
    + pub fn new(history_speed: HistorySpeedConfig, priority: Option<DownloadTaskPriority>, context: SingleDownloadContext) -> Self 






#### TunnelManager // Stream 和 NDN 更底层接口，优先上层接口
+ TunnelManager 定义
```rust
struct TunnelManagerImpl {
    stack: WeakStack, 
    entries: RwLock<BTreeMap<DeviceId, TunnelGuard>>
}

#[derive(Clone)]
pub struct TunnelManager(Arc<TunnelManagerImpl>);
```
+ impl TunnelManager 
    + pub fn new(stack: WeakStack) -> Self 
    + fn check_recyle(&self)
    + fn config_for(&self, _remote_const: &DeviceDesc) -> Config
    + pub(crate) fn keep(&self, _remote_const: &DeviceDesc) -> BuckyResult<()>
    + pub(crate) fn create_container(&self, remote_const: &DeviceDesc) -> Result<TunnelGuard, BuckyError>
    + pub(crate) fn container_of(&self, remote: &DeviceId) -> Option<TunnelGuard>
    + pub(crate) fn reset(&self) 

#### TunnelGuard

##### TCP Tunnel


##### UDP Tunnel


### StackConfig



### BDT 协议栈初始化关键流程

+ cyfs_bdt::Stack::Open() : BDT 协议栈初始化
+ cyfs_bdt::Stack::net_manager().listener().wait_online() : BDT 协议栈上线流程
+ cyfs_bdt::Stack::stream_manager().listen() : 监听连接请求
+ 
