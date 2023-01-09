import { ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, RandomGenerator, HttpDownloader } from '../../base';
import * as path from "path"
import { StackProxyClient } from "../../taskTools/cyfs_stack_tunnel/stackTool"
import * as cyfs from "../../taskTools/cyfs_stack_tunnel/cyfs_node"
import * as fs from "fs-extra"; 


async function test_file(_interface: TaskClientInterface,DMC_Download:StackProxyClient,DMC_Upload:StackProxyClient,stack_download:cyfs.SharedCyfsStack,stack_upload:cyfs.SharedCyfsStack,fileSize:number,timeout:number) {
    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
   
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
    _interface.getLogger().info(`${JSON.stringify(add_file)}`);
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
    _interface.getLogger().info(`${JSON.stringify(get_ret)}`)
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
    let savePath = path.join(__dirname,"../../DMC.txt")
    if(!fs.pathExistsSync(savePath)){
        fs.createFileSync(savePath)
    }
    
    _interface.getLogger().info(`${JSON.stringify(get_ret2) }`)
    for(let i=0;i<1;i++){
        let result = await download(_interface,DMC_Download,stack_download,stack_upload,fileSize,timeout,test_file,createFile.fileName!)
        let file = fs.appendFileSync(savePath,`${JSON.stringify(result)}\n`)
        if(result.err == ErrorCode.succ){
            return;
        }
    }
}

export async function  download(_interface: TaskClientInterface,DMC_Download:StackProxyClient,stack_download:cyfs.SharedCyfsStack,stack_upload:cyfs.SharedCyfsStack,fileSize:number,timeout:number,test_file:cyfs.ObjectId,fileName:string,error_time:number=0){
    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
    let download_path = await DMC_Download.util_client!.getCachePath();
    let save_filePath =  path.join( download_path.cache_path!.file_download!,fileName!)

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
    let savePath = path.join(__dirname,"../../DMC_download.txt")
    if(!fs.pathExistsSync(savePath)){
        fs.createFileSync(savePath)
    }
    let errorPath = path.join(__dirname,"../../DMC_error.txt")
    fs.removeSync(errorPath);
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
        let file = fs.appendFileSync(savePath,` ${JSON.stringify(task.unwrap())}\n`)
        let state = task.unwrap().state;
        if(state==4){
            _interface.getLogger().info(`####### 传输完成： ${JSON.stringify(task.unwrap())} ,time = ${Date.now() - begin} ,文件大小 : ${fileSize}` );
            return {err:ErrorCode.succ,fileId:test_file.to_base_58(),time:Date.now() - begin,fileSize}
        }
        if(state==5){
            _interface.getLogger().info(`####### 传输完成： ${JSON.stringify(task.unwrap())} ,time = ${Date.now() - begin} ,文件大小 : ${fileSize}` );
            error_time = error_time + 1;
            if(error_time>20){
                return {err:ErrorCode.exception,fileId:test_file.to_base_58(),time:Date.now() - begin,fileSize}
            }
            fs.createFileSync(errorPath);
            fs.appendFileSync(errorPath,`fileId=${test_file.to_base_58()}#fileName=${fileName}#error_time=${error_time}`)
            return {err:ErrorCode.exception,fileId:test_file.to_base_58(),time:Date.now() - begin,fileSize}
            
        }
        await cyfs.sleep(1000)
    }
    

    return {err:ErrorCode.timeout,fileId:test_file.to_base_58(),time:Date.now() - begin,fileSize}
}


export async function TaskMain(_interface: TaskClientInterface) {

    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
    let DMC_Download = new StackProxyClient({
        _interface,
        peerName: "PC_0005", // DMC_Download
        stack_type: "ood",
        timeout: 60 * 1000,
        ws_port: 20001,
        http_port: 20002  
    })
    await DMC_Download.init();
    let DMC_Upload = new StackProxyClient({
        _interface,
        peerName: "PC_0018",  // DMC_Upload
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
    let errorPath = path.join(__dirname,"../../DMC_error.txt")
    let fileSize = 50*1024*1024;
    if(fs.pathExistsSync(errorPath)){
        let data = fs.readFileSync(errorPath).toString();
        let fileId_str = data.split("#")[0].split("=")[1]
        let fileName = data.split("#")[1].split("=")[1]
        let error_time = Number(data.split("#")[2].split("=")[1]) 
        _interface.getLogger().info(`fileId_str = ${fileId_str}  fileName = ${fileName} error_time =${error_time}`)
        let fileId = cyfs.ObjectId.from_base_58(fileId_str).unwrap();
        let result = await  download(_interface,DMC_Download,stack_download,stack_upload,fileSize,400,fileId,fileName,error_time);
        await _interface.exit(ClientExitCode.failed, `${result}`)
    }
    let result = await test_file(_interface,DMC_Download,DMC_Upload,stack_download,stack_upload,fileSize,400);
    
    await _interface.exit(ClientExitCode.failed, `${result}`)
}