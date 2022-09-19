import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator } from '../../base';
import * as path from "path"
import { StackProxyClient } from "../../taskTools/cyfs_stack_tunnel/stackTool"
import * as cyfs from "../../taskTools/cyfs_stack_tunnel/cyfs_node"



async function test_file(_interface: TaskClientInterface,DMC_Download:StackProxyClient,DMC_Upload:StackProxyClient,stack_download:cyfs.SharedCyfsStack,stack_upload:cyfs.SharedCyfsStack,fileSize:number,timeout:number) {
    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
    let download_path = await DMC_Download.util_client!.getCachePath();
    let createFile = await DMC_Upload.util_client!.createFile(fileSize);
    let add_file = await stack_upload.trans().publish_file({
        common: {// 请求路径，可为空
            req_path: "qaTest",
            // 来源DEC
            // api级别
            dec_id,
            level: cyfs.NDNAPILevel.NDN,
            target : stack_upload.local_device_id().object_id,
            // targrt设备参数
            // 需要处理数据的关联对象，主要用以chunk/file等
            referer_object: [],
            flags: 1,
        },
        owner: stack_upload.local_device_id().object_id,
        local_path: createFile.filePath!,
        chunk_size: 4 * 1024 * 1024
    });
   
    let test_file = add_file.unwrap().file_id
    let task_id: string;
    await cyfs.sleep(1000)

    const req1: cyfs.NONGetObjectOutputRequest = {
        object_id: test_file,
        common: {
            req_path: "qaTest",
            level: cyfs.NONAPILevel.NON,
            target: stack_upload.local_device_id().object_id,
            dec_id,
            flags: 0,
        }
    };
    const get_ret = await stack_upload.non_service().get_object(req1);
    let file_obj = get_ret.unwrap().object;
    let stream = await stack_upload.non_service().put_object({
        common: {
            dec_id,
            flags: 0,
            target: stack_download.local_device_id().object_id,
            level: cyfs.NONAPILevel.Router //设置路由类型
        },
        object: new cyfs.NONObjectInfo(test_file, file_obj.object_raw)
    })
    _interface.getLogger().info(`##### ${JSON.stringify(stream.unwrap().result) }`)
    await cyfs.sleep(1000)
    _interface.getLogger().info("获取task object");
    const req2: cyfs.NONGetObjectOutputRequest = {
        object_id:test_file,
        common: {
            req_path: "qaTest",
            level: cyfs.NONAPILevel.Router,
            target :stack_upload.local_device_id().object_id,
            dec_id,
            flags: 0,
        }
    };
    const get_ret2 = await stack_download.non_service().get_object(req2);
    get_ret2.unwrap().object
    let save_filePath =  path.join( download_path.cache_path!.file_download!,createFile.fileName!)
    _interface.getLogger().info(`${JSON.stringify(get_ret2) }`)
    let begin = Date.now();
    let download = await stack_download.trans().create_task( {
        common:  {
            req_path: "qaTest",
            dec_id,
            level: cyfs.NDNAPILevel.Router,
            target : stack_download.local_device_id().object_id,
            referer_object: [new cyfs.NDNDataRefererObject(test_file)],
            flags: 1,
        },
        object_id: test_file,
        local_path: save_filePath,
        device_list: [stack_upload.local_device_id()],
        auto_start: true,
    })
    _interface.getLogger().info(`##${download}`)
    
    let download_id  = download.unwrap().task_id
    for(let i =0;i<timeout;i++){
        let task = await stack_download.trans().get_task_state( {
            common:  {
                req_path: "qaTest",
                dec_id,
                level: cyfs.NDNAPILevel.Router,
                referer_object: [],
                flags: 1,
            },
            task_id : download_id
        })
        _interface.getLogger().info(`####### 传输状态： ${JSON.stringify(task.unwrap())}` );
        let state = task.unwrap().state;
        if(state==4){
            _interface.getLogger().info(`####### 传输完成： ${JSON.stringify(task.unwrap())} ,time = ${Date.now() - begin} ,文件大小 : ${fileSize}` );
            return {err:ErrorCode.succ,fileId:test_file.to_base_58(),time:Date.now() - begin,fileSize}
        }
        if(state==5){
            _interface.getLogger().info(`####### 传输完成： ${JSON.stringify(task.unwrap())} ,time = ${Date.now() - begin} ,文件大小 : ${fileSize}` );
            return {err:ErrorCode.exception,fileId:test_file.to_base_58(),time:Date.now() - begin,fileSize}
            
        }
        await cyfs.sleep(1000)
    }
    return {err:ErrorCode.timeout,fileId:test_file.to_base_58(),time:Date.now() - begin,fileSize}
}


async function put_object(_interface: TaskClientInterface,DMC_Download:StackProxyClient,DMC_Upload:StackProxyClient,stack_download:cyfs.SharedCyfsStack,stack_upload:cyfs.SharedCyfsStack) {
    try {
        let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
        let object = cyfs.TextObject.create(cyfs.Some(stack_upload.local_device_id().object_id),`${RandomGenerator.string(100)}`,`${RandomGenerator.string(100)}`,`${RandomGenerator.string(100)}`)
        let begin = Date.now();
        let stream = await stack_upload.non_service().put_object({
            common: {
                dec_id,
                flags: 0,
                target: stack_download.local_device_id().object_id,
                level: cyfs.NONAPILevel.Router //设置路由类型
            },
            object: new cyfs.NONObjectInfo(object.desc().object_id(), object.to_vec().unwrap())
        })
        let time = Date.now() - begin;
        _interface.getLogger().info(`##### put_object result = ${JSON.stringify(stream.unwrap()) } ,time = ${time}`);
        if(stream.err){
            return {err:stream.err,time,log:`${JSON.stringify(stream.unwrap())}`}
        }else{
            return {err:stream.err,time,log:`success`}
        }
    } catch (error) {
        return {err:ErrorCode.exception,time:0,log:`${error}`}
    }
    
}

export async function TaskMain(_interface: TaskClientInterface) {

    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
    let DMC_Download = new StackProxyClient({
        _interface,
        peerName: "DMC_Download",
        stack_type: "ood",
        timeout: 60 * 1000,
        ws_port: 20001,
        http_port: 20002
    })
    await DMC_Download.init();
    let DMC_Upload = new StackProxyClient({
        _interface,
        peerName: "DMC_Upload",
        stack_type: "ood",
        timeout: 60 * 1000,
        ws_port: 20003,
        http_port: 20004
    })
    await DMC_Upload.init();
    
    _interface.getLogger().info(`Waiting for proxy to connection...`);
    let stack_download = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001,dec_id).unwrap())
    let resp = await stack_download.wait_online(cyfs.None);
    _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    let res = await stack_download.util().get_zone({ common: { flags: 0 } });
    let stack_upload = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20004, 20003,dec_id).unwrap())
    let resp2 = await stack_upload.wait_online(cyfs.None);
    _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    let res2 = await stack_upload.util().get_zone({ common: { flags: 0 } });
    // {
    //     let success = 0;
    //     let failed = 0;
    //     let total = 0;
    //     let countTime = 0;
    //     for(let i =0;i<1000000000;i++){
    //         let result = await put_object(_interface,DMC_Download,DMC_Upload,stack_download,stack_upload);
    //         total++
    //         _interface.getLogger().info(`####### 第${total} 次执行结果：${result.err},time = ${result.time},log = ${result.log}`);
    //         if(i%1000 == 0){
    //             _interface.getLogger().info(`####### 总共执行 ${total} 次`);
    //             _interface.getLogger().info(`####### 成功 ${success} 次`);
    //             _interface.getLogger().info(`####### 失败 ${failed} 次`);
    //             _interface.getLogger().info(`####### 平均时间 ${countTime/success} ms`);
    //         }
    //         if(result.err){
    //             failed++
    //         }else{
    //             success++
    //             countTime = countTime + result.time
    //         }
    //     }     
    // }
    let result = await test_file(_interface,DMC_Download,DMC_Upload,stack_download,stack_upload,50*1024*1024,1000);

    _interface.exit(ClientExitCode.failed, `${result}`)
}