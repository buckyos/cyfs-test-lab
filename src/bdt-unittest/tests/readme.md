

### 运行方法
由于cargo test 默认是多线程并行执行用例，需要设置线程数为1，避免用例并行执行
```
cargo test test_stream_udp_connect_00 -- --test-threads=1
```