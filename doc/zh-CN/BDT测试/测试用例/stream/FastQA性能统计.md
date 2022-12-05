
### FastQA流程
```
(0) LN上层准备开始发起QA , 当前时间 begin
(1) LN生成Question 数据，计算hash (上层业务操作)
(2) LN 发起连接 当前时间 begin_connect
>>>中间 SNCall流程走默认流程
(3) RN 收到连接请求,读取Question数据，计算hash,生成Answer,计算hash（上层业务操作calculate_time）
(4) RN 发起confirm，统计confirm完成时间confirm_time
(5) LN 连接成功,统计连接耗时connect_time
(6) LN 读取answer,对answer计算hash，计算完成总时间total_time    
```

统计时间数据：
+ LN connect_time
+ LN calculate_time = LN构造Question + LN读取Answer
+ LN total_time
+ RN confirm_time
+ RN calculate_time = RN读取Question + RN构造Answer

统计其他数据
+ LN: send_hash、recv_hash、question_szie
+ RN: send_hash、recv_hash、answer_szie

### 非FastQA流程
```
(0) LN上层准备开始发起QA , 当前时间 begin
(1) LN 发起连接 当前时间 begin_connect
>>>中间 SNCall流程走默认流程
(2) RN 收到连接请求，进行confrim，统计confirm完成时confirm_time
(3) LN 连接成功,统计连接耗时connect_time
(4) LN 生成Question 数据，计算hash （上层业务操作）
(5) LN 进行write_stream,统计send_time
(6) RN 进行read_stream,读取Question数据，
(7) 计算hash;生成Answer,计算hash （上层业务操作）
(8) RN 进行write_stream,统计send_time
(9) LN 进行read_stream读取answer,对answer计算hash
(10) 统计LN最终完成时间total_time
```

统计时间数据：
+ LN connect_time
+ LN calculate_time = LN构造Question + LN读取Answer
+ LN send_time
+ LN recv_time
+ LN total_time
+ RN confirm_time
+ RN recv_time
+ RN calculate_time = LN构造Question + LN读取Answer
+ RN send_time

统计其他数据
+ LN: send_hash、recv_hash、question_szie
+ RN: send_hash、recv_hash、answer_szie

### 对比数据
+ total_time : 一次QA总耗时
+ connect_time ：使用FastQA 会增加连接时间，但FastQA 连接时间包含了数据发送 
+ 业务耗时 = LN calculate_time  + RN calculate_time 
 
### 对比数据公式
+ 一次标准QA总耗时：FastQA total_time VS 非 FastQA total_time
+ 连接的耗时：FastQA connect_time VS 非 FastQA connect_time
+ BDT 网络传输时间 = total_time - 业务操作耗时
+ 业务操作耗时 : FastQA Random和hash 时间 等于 非FastQA Random和hash 时间，本身操作时间一样(但业务操作时间占比可能影响最终性能)
+ FastQA流程业务操作耗时  = LN构造Question + RN读取Question + RN构造Answer + LN读取Answer = total_time - LN connect_time + RN calculate_time
+ 非FastQAFastQA流程业务操作耗时 =  = LN构造Question + RN读取Question + RN构造Answer + LN读取Answer = total_time - LN connect_time - LN recv_time + RN calculate_time