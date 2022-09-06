"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskMain = exports.download = void 0;
const base_1 = require("../../base");
const path = __importStar(require("path"));
const stackTool_1 = require("../../taskTools/cyfs_stack_tunnel/stackTool");
const cyfs = __importStar(require("../../taskTools/cyfs_stack_tunnel/cyfs_node"));
const fs = __importStar(require("fs-extra"));
async function test_file(_interface, DMC_Download, DMC_Upload, stack_download, stack_upload, fileSize, timeout) {
    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
    let createFile = await DMC_Upload.util_client.createFile(fileSize);
    let add_file = await stack_upload.trans().publish_file({
        common: {
            req_path: "qaTest",
            // 来源DEC
            // api级别
            dec_id,
            level: cyfs.NDNAPILevel.NDN,
            target: stack_upload.local_device_id().object_id,
            // targrt设备参数
            // 需要处理数据的关联对象，主要用以chunk/file等
            referer_object: [],
            flags: 1,
        },
        owner: stack_upload.local_device_id().object_id,
        local_path: createFile.filePath,
        chunk_size: 4 * 1024 * 1024
    });
    _interface.getLogger().info(`${JSON.stringify(add_file)}`);
    let test_file = add_file.unwrap().file_id;
    let task_id;
    await cyfs.sleep(1000);
    const req1 = {
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
    _interface.getLogger().info(`${JSON.stringify(get_ret)}`);
    let file_obj = get_ret.unwrap().object;
    let stream = await stack_upload.non_service().put_object({
        common: {
            dec_id,
            flags: 0,
            target: stack_download.local_device_id().object_id,
            level: cyfs.NONAPILevel.Router //设置路由类型
        },
        object: new cyfs.NONObjectInfo(test_file, file_obj.object_raw)
    });
    _interface.getLogger().info(`##### ${JSON.stringify(stream.unwrap().result)}`);
    await cyfs.sleep(1000);
    _interface.getLogger().info("获取task object");
    const req2 = {
        object_id: test_file,
        common: {
            req_path: "qaTest",
            level: cyfs.NONAPILevel.Router,
            target: stack_upload.local_device_id().object_id,
            dec_id,
            flags: 0,
        }
    };
    const get_ret2 = await stack_download.non_service().get_object(req2);
    get_ret2.unwrap().object;
    let savePath = path.join(__dirname, "../../DMC.txt");
    if (!fs.pathExistsSync(savePath)) {
        fs.createFileSync(savePath);
    }
    _interface.getLogger().info(`${JSON.stringify(get_ret2)}`);
    for (let i = 0; i < 1; i++) {
        let result = await download(_interface, DMC_Download, stack_download, stack_upload, fileSize, timeout, test_file, createFile.fileName);
        let file = fs.appendFileSync(savePath, `${JSON.stringify(result)}\n`);
        if (result.err == base_1.ErrorCode.succ) {
            return;
        }
    }
}
async function download(_interface, DMC_Download, stack_download, stack_upload, fileSize, timeout, test_file, fileName, error_time = 0) {
    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
    let download_path = await DMC_Download.util_client.getCachePath();
    let save_filePath = path.join(download_path.cache_path.file_download, fileName);
    let begin = Date.now();
    let download = await stack_download.trans().create_task({
        common: {
            req_path: "qaTest",
            dec_id,
            level: cyfs.NDNAPILevel.Router,
            target: stack_download.local_device_id().object_id,
            referer_object: [new cyfs.NDNDataRefererObject(test_file)],
            flags: 1,
        },
        object_id: test_file,
        local_path: save_filePath,
        device_list: [stack_upload.local_device_id()],
        auto_start: true,
    });
    _interface.getLogger().info(`##${download}`);
    let savePath = path.join(__dirname, "../../DMC_download.txt");
    if (!fs.pathExistsSync(savePath)) {
        fs.createFileSync(savePath);
    }
    let errorPath = path.join(__dirname, "../../DMC_error.txt");
    fs.removeSync(errorPath);
    let download_id = download.unwrap().task_id;
    for (let i = 0; i < timeout; i++) {
        let task = await stack_download.trans().get_task_state({
            common: {
                req_path: "qaTest",
                dec_id,
                level: cyfs.NDNAPILevel.Router,
                referer_object: [],
                flags: 1,
            },
            task_id: download_id
        });
        _interface.getLogger().info(`####### 传输状态： ${JSON.stringify(task.unwrap())}`);
        let file = fs.appendFileSync(savePath, ` ${JSON.stringify(task.unwrap())}\n`);
        let state = task.unwrap().state;
        if (state == 4) {
            _interface.getLogger().info(`####### 传输完成： ${JSON.stringify(task.unwrap())} ,time = ${Date.now() - begin} ,文件大小 : ${fileSize}`);
            return { err: base_1.ErrorCode.succ, fileId: test_file.to_base_58(), time: Date.now() - begin, fileSize };
        }
        if (state == 5) {
            _interface.getLogger().info(`####### 传输完成： ${JSON.stringify(task.unwrap())} ,time = ${Date.now() - begin} ,文件大小 : ${fileSize}`);
            error_time = error_time + 1;
            if (error_time > 20) {
                return { err: base_1.ErrorCode.exception, fileId: test_file.to_base_58(), time: Date.now() - begin, fileSize };
            }
            fs.createFileSync(errorPath);
            fs.appendFileSync(errorPath, `fileId=${test_file.to_base_58()}#fileName=${fileName}#error_time=${error_time}`);
            return { err: base_1.ErrorCode.exception, fileId: test_file.to_base_58(), time: Date.now() - begin, fileSize };
        }
        await cyfs.sleep(1000);
    }
    return { err: base_1.ErrorCode.timeout, fileId: test_file.to_base_58(), time: Date.now() - begin, fileSize };
}
exports.download = download;
async function TaskMain(_interface) {

    let dec_id = cyfs.ObjectId.from_base_58("9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM").unwrap();
    let DMC_Download = new stackTool_1.StackProxyClient({
        _interface,
        peerName: "PC_0005",
        stack_type: "ood",
        timeout: 60 * 1000,
        ws_port: 20001,
        http_port: 20002
    });
    await DMC_Download.init();
    let DMC_Upload = new stackTool_1.StackProxyClient({
        _interface,
        peerName: "PC_0018",
        stack_type: "ood",
        timeout: 60 * 1000,
        ws_port: 20003,
        http_port: 20004
    });
    await DMC_Upload.init();
    _interface.getLogger().info(`Waiting for proxy to connection...`);
    let stack_download = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20002, 20001, dec_id).unwrap());
    let resp = await stack_download.wait_online(cyfs.None);
    _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    let res = await stack_download.util().get_zone({ common: { flags: 0 } });
    let stack_upload = cyfs.SharedCyfsStack.open(cyfs.SharedCyfsStackParam.new_with_ws_event_ports(20004, 20003, dec_id).unwrap());
    let resp2 = await stack_upload.wait_online(cyfs.None);
    _interface.getLogger().info(`wait_online finished ${JSON.stringify(resp.unwrap())}`);
    let res2 = await stack_upload.util().get_zone({ common: { flags: 0 } });
    let errorPath = path.join(__dirname, "../../DMC_error.txt");
    let fileSize = 50 * 1024 * 1024;
    if (fs.pathExistsSync(errorPath)) {
        let data = fs.readFileSync(errorPath).toString();
        let fileId_str = data.split("#")[0].split("=")[1];
        let fileName = data.split("#")[1].split("=")[1];
        let error_time = Number(data.split("#")[2].split("=")[1]);
        _interface.getLogger().info(`fileId_str = ${fileId_str}  fileName = ${fileName} error_time =${error_time}`);
        let fileId = cyfs.ObjectId.from_base_58(fileId_str).unwrap();
        let result = await download(_interface, DMC_Download, stack_download, stack_upload, fileSize, 400, fileId, fileName, error_time);
        await _interface.exit(base_1.ClientExitCode.failed, `${result}`);
    }
    let result = await test_file(_interface, DMC_Download, DMC_Upload, stack_download, stack_upload, fileSize, 400);
    await _interface.exit(base_1.ClientExitCode.failed, `${result}`);
}
exports.TaskMain = TaskMain;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvdGFza3MvRE1DX2RlYnVnZXJfNTBNQi9vbmxvYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHFDQUFxTDtBQUNyTCwyQ0FBNEI7QUFDNUIsMkVBQThFO0FBQzlFLGtGQUFtRTtBQUNuRSw2Q0FBK0I7QUFHL0IsS0FBSyxVQUFVLFNBQVMsQ0FBQyxVQUErQixFQUFDLFlBQTZCLEVBQUMsVUFBMkIsRUFBQyxjQUFtQyxFQUFDLFlBQWlDLEVBQUMsUUFBZSxFQUFDLE9BQWM7SUFDbk4sSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsOENBQThDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUVqRyxJQUFJLFVBQVUsR0FBRyxNQUFNLFVBQVUsQ0FBQyxXQUFZLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BFLElBQUksUUFBUSxHQUFHLE1BQU0sWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLFlBQVksQ0FBQztRQUNuRCxNQUFNLEVBQUU7WUFDSixRQUFRLEVBQUUsUUFBUTtZQUNsQixRQUFRO1lBQ1IsUUFBUTtZQUNSLE1BQU07WUFDTixLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHO1lBQzNCLE1BQU0sRUFBRyxZQUFZLENBQUMsZUFBZSxFQUFFLENBQUMsU0FBUztZQUNqRCxhQUFhO1lBQ2IsOEJBQThCO1lBQzlCLGNBQWMsRUFBRSxFQUFFO1lBQ2xCLEtBQUssRUFBRSxDQUFDO1NBQ1g7UUFDRCxLQUFLLEVBQUUsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFDLFNBQVM7UUFDL0MsVUFBVSxFQUFFLFVBQVUsQ0FBQyxRQUFTO1FBQ2hDLFVBQVUsRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUk7S0FDOUIsQ0FBQyxDQUFDO0lBQ0gsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FB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QixVQUFVLGdCQUFnQixRQUFRLGdCQUFnQixVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQzNHLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzdELElBQUksTUFBTSxHQUFHLE1BQU8sUUFBUSxDQUFDLFVBQVUsRUFBQyxZQUFZLEVBQUMsY0FBYyxFQUFDLFlBQVksRUFBQyxRQUFRLEVBQUMsR0FBRyxFQUFDLE1BQU0sRUFBQyxRQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUgsTUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLHFCQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUMsQ0FBQTtLQUM1RDtJQUNELElBQUksTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBQyxZQUFZLEVBQUMsVUFBVSxFQUFDLGNBQWMsRUFBQyxZQUFZLEVBQUMsUUFBUSxFQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRTFHLE1BQU0sVUFBVSxDQUFDLElBQUksQ0FBQyxxQkFBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUE7QUFDN0QsQ0FBQztBQTlDRCw0QkE4Q0MiLCJmaWxlIjoidGFza3MvRE1DX2RlYnVnZXJfNTBNQi9vbmxvYWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFcnJvckNvZGUsIE5ldEVudHJ5LCBOYW1lc3BhY2UsIEFjY2Vzc05ldFR5cGUsIEJ1ZmZlclJlYWRlciwgTG9nZ2VyLCBUYXNrQ2xpZW50SW50ZXJmYWNlLCBDbGllbnRFeGl0Q29kZSwgQnVmZmVyV3JpdGVyLCBSYW5kb21HZW5lcmF0b3IsIEh0dHBEb3dubG9hZGVyIH0gZnJvbSAnLi4vLi4vYmFzZSc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIlxyXG5pbXBvcnQgeyBTdGFja1Byb3h5Q2xpZW50IH0gZnJvbSBcIi4uLy4uL3Rhc2tUb29scy9jeWZzX3N0YWNrX3R1bm5lbC9zdGFja1Rvb2xcIlxyXG5pbXBvcnQgKiBhcyBjeWZzIGZyb20gXCIuLi8uLi90YXNrVG9vbHMvY3lmc19zdGFja190dW5uZWwvY3lmc19ub2RlXCJcclxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzLWV4dHJhXCI7IFxyXG5cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRlc3RfZmlsZShfaW50ZXJmYWNlOiBUYXNrQ2xpZW50SW50ZXJmYWNlLERNQ19Eb3dubG9hZDpTdGFja1Byb3h5Q2xpZW50LERNQ19VcGxvYWQ6U3RhY2tQcm94eUNsaWVudCxzdGFja19kb3dubG9hZDpjeWZzLlNoYXJlZEN5ZnNTdGFjayxzdGFja191cGxvYWQ6Y3lmcy5TaGFyZWRDeWZzU3RhY2ssZmlsZVNpemU6bnVtYmVyLHRpbWVvdXQ6bnVtYmVyKSB7XHJcbiAgICBsZXQgZGVjX2lkID0gY3lmcy5PYmplY3RJZC5mcm9tX2Jhc2VfNTgoXCI5dEdwTE5uYWI5dVZ0amVhSzRiTTU5UUtTa0xFR1dvdzFwSnE2aGpqSzlNTVwiKS51bndyYXAoKTtcclxuICAgXHJcbiAgICBsZXQgY3JlYXRlRmlsZSA9IGF3YWl0IERNQ19VcGxvYWQudXRpbF9jbGllbnQhLmNyZWF0ZUZpbGUoZmlsZVNpemUpO1xyXG4gICAgbGV0IGFkZF9maWxlID0gYXdhaXQgc3RhY2tfdXBsb2FkLnRyYW5zKCkucHVibGlzaF9maWxlKHtcclxuICAgICAgICBjb21tb246IHsvLyDor7fmsYLot6/lvoTvvIzlj6/kuLrnqbpcclxuICAgICAgICAgICAgcmVxX3BhdGg6IFwicWFUZXN0XCIsXHJcbiAgICAgICAgICAgIC8vIOadpea6kERFQ1xyXG4gICAgICAgICAgICAvLyBhcGnnuqfliKtcclxuICAgICAgICAgICAgZGVjX2lkLFxyXG4gICAgICAgICAgICBsZXZlbDogY3lmcy5ORE5BUElMZXZlbC5ORE4sXHJcbiAgICAgICAgICAgIHRhcmdldCA6IHN0YWNrX3VwbG9hZC5sb2NhbF9kZXZpY2VfaWQoKS5vYmplY3RfaWQsXHJcbiAgICAgICAgICAgIC8vIHRhcmdydOiuvuWkh+WPguaVsFxyXG4gICAgICAgICAgICAvLyDpnIDopoHlpITnkIbmlbDmja7nmoTlhbPogZTlr7nosaHvvIzkuLvopoHnlKjku6VjaHVuay9maWxl562JXHJcbiAgICAgICAgICAgIHJlZmVyZXJfb2JqZWN0OiBbXSxcclxuICAgICAgICAgICAgZmxhZ3M6IDEsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBvd25lcjogc3RhY2tfdXBsb2FkLmxvY2FsX2RldmljZV9pZCgpLm9iamVjdF9pZCxcclxuICAgICAgICBsb2NhbF9wYXRoOiBjcmVhdGVGaWxlLmZpbGVQYXRoISxcclxuICAgICAgICBjaHVua19zaXplOiA0ICogMTAyNCAqIDEwMjRcclxuICAgIH0pO1xyXG4gICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGAke0pTT04uc3RyaW5naWZ5KGFkZF9maWxlKX1gKTtcclxuICAgIGxldCB0ZXN0X2ZpbGUgPSBhZGRfZmlsZS51bndyYXAoKS5maWxlX2lkXHJcbiAgICBsZXQgdGFza19pZDogc3RyaW5nO1xyXG4gICAgYXdhaXQgY3lmcy5zbGVlcCgxMDAwKVxyXG5cclxuICAgIGNvbnN0IHJlcTE6IGN5ZnMuTk9OR2V0T2JqZWN0T3V0cHV0UmVxdWVzdCA9IHtcclxuICAgICAgICBvYmplY3RfaWQ6IHRlc3RfZmlsZSxcclxuICAgICAgICBjb21tb246IHtcclxuICAgICAgICAgICAgcmVxX3BhdGg6IFwicWFUZXN0XCIsXHJcbiAgICAgICAgICAgIGxldmVsOiBjeWZzLk5PTkFQSUxldmVsLk5PTixcclxuICAgICAgICAgICAgdGFyZ2V0OiBzdGFja191cGxvYWQubG9jYWxfZGV2aWNlX2lkKCkub2JqZWN0X2lkLFxyXG4gICAgICAgICAgICBkZWNfaWQsXHJcbiAgICAgICAgICAgIGZsYWdzOiAwLFxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBjb25zdCBnZXRfcmV0ID0gYXdhaXQgc3RhY2tfdXBsb2FkLm5vbl9zZXJ2aWNlKCkuZ2V0X29iamVjdChyZXExKTtcclxuICAgIF9pbnRlcmZhY2UuZ2V0TG9nZ2VyKCkuaW5mbyhgJHtKU09OLnN0cmluZ2lmeShnZXRfcmV0KX1gKVxyXG4gICAgbGV0IGZpbGVfb2JqID0gZ2V0X3JldC51bndyYXAoKS5vYmplY3Q7XHJcbiAgICBsZXQgc3RyZWFtID0gYXdhaXQgc3RhY2tfdXBsb2FkLm5vbl9zZXJ2aWNlKCkucHV0X29iamVjdCh7XHJcbiAgICAgICAgY29tbW9uOiB7XHJcbiAgICAgICAgICAgIGRlY19pZCxcclxuICAgICAgICAgICAgZmxhZ3M6IDAsXHJcbiAgICAgICAgICAgIHRhcmdldDogc3RhY2tfZG93bmxvYWQubG9jYWxfZGV2aWNlX2lkKCkub2JqZWN0X2lkLFxyXG4gICAgICAgICAgICBsZXZlbDogY3lmcy5OT05BUElMZXZlbC5Sb3V0ZXIgLy/orr7nva7ot6/nlLHnsbvlnotcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9iamVjdDogbmV3IGN5ZnMuTk9OT2JqZWN0SW5mbyh0ZXN0X2ZpbGUsIGZpbGVfb2JqLm9iamVjdF9yYXcpXHJcbiAgICB9KVxyXG4gICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGAjIyMjIyAke0pTT04uc3RyaW5naWZ5KHN0cmVhbS51bndyYXAoKS5yZXN1bHQpIH1gKVxyXG4gICAgYXdhaXQgY3lmcy5zbGVlcCgxMDAwKVxyXG4gICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKFwi6I635Y+WdGFzayBvYmplY3RcIik7XHJcbiAgICBjb25zdCByZXEyOiBjeWZzLk5PTkdldE9iamVjdE91dHB1dFJlcXVlc3QgPSB7XHJcbiAgICAgICAgb2JqZWN0X2lkOnRlc3RfZmlsZSxcclxuICAgICAgICBjb21tb246IHtcclxuICAgICAgICAgICAgcmVxX3BhdGg6IFwicWFUZXN0XCIsXHJcbiAgICAgICAgICAgIGxldmVsOiBjeWZzLk5PTkFQSUxldmVsLlJvdXRlcixcclxuICAgICAgICAgICAgdGFyZ2V0IDpzdGFja191cGxvYWQubG9jYWxfZGV2aWNlX2lkKCkub2JqZWN0X2lkLFxyXG4gICAgICAgICAgICBkZWNfaWQsXHJcbiAgICAgICAgICAgIGZsYWdzOiAwLFxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBjb25zdCBnZXRfcmV0MiA9IGF3YWl0IHN0YWNrX2Rvd25sb2FkLm5vbl9zZXJ2aWNlKCkuZ2V0X29iamVjdChyZXEyKTtcclxuICAgIGdldF9yZXQyLnVud3JhcCgpLm9iamVjdFxyXG4gICAgbGV0IHNhdmVQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSxcIi4uLy4uL0RNQy50eHRcIilcclxuICAgIGlmKCFmcy5wYXRoRXhpc3RzU3luYyhzYXZlUGF0aCkpe1xyXG4gICAgICAgIGZzLmNyZWF0ZUZpbGVTeW5jKHNhdmVQYXRoKVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBfaW50ZXJmYWNlLmdldExvZ2dlcigpLmluZm8oYCR7SlNPTi5zdHJpbmdpZnkoZ2V0X3JldDIpIH1gKVxyXG4gICAgZm9yKGxldCBpPTA7aTwxO2krKyl7XHJcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IGRvd25sb2FkKF9pbnRlcmZhY2UsRE1DX0Rvd25sb2FkLHN0YWNrX2Rvd25sb2FkLHN0YWNrX3VwbG9hZCxmaWxlU2l6ZSx0aW1lb3V0LHRlc3RfZmlsZSxjcmVhdGVGaWxlLmZpbGVOYW1lISlcclxuICAgICAgICBsZXQgZmlsZSA9IGZzLmFwcGVuZEZpbGVTeW5jKHNhdmVQYXRoLGAke0pTT04uc3RyaW5naWZ5KHJlc3VsdCl9XFxuYClcclxuICAgICAgICBpZihyZXN1bHQuZXJyID09IEVycm9yQ29kZS5zdWNjKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uICBkb3dubG9hZChfaW50ZXJmYWNlOiBUYXNrQ2xpZW50SW50ZXJmYWNlLERNQ19Eb3dubG9hZDpTdGFja1Byb3h5Q2xpZW50LHN0YWNrX2Rvd25sb2FkOmN5ZnMuU2hhcmVkQ3lmc1N0YWNrLHN0YWNrX3VwbG9hZDpjeWZzLlNoYXJlZEN5ZnNTdGFjayxmaWxlU2l6ZTpudW1iZXIsdGltZW91dDpudW1iZXIsdGVzdF9maWxlOmN5ZnMuT2JqZWN0SWQsZmlsZU5hbWU6c3RyaW5nLGVycm9yX3RpbWU6bnVtYmVyPTApe1xyXG4gICAgbGV0IGRlY19pZCA9IGN5ZnMuT2JqZWN0SWQuZnJvbV9iYXNlXzU4KFwiOXRHcExObmFiOXVWdGplYUs0Yk01OVFLU2tMRUdXb3cxcEpxNmhqaks5TU1cIikudW53cmFwKCk7XHJcbiAgICBsZXQgZG93bmxvYWRfcGF0aCA9IGF3YWl0IERNQ19Eb3dubG9hZC51dGlsX2NsaWVudCEuZ2V0Q2FjaGVQYXRoKCk7XHJcbiAgICBsZXQgc2F2ZV9maWxlUGF0aCA9ICBwYXRoLmpvaW4oIGRvd25sb2FkX3BhdGguY2FjaGVfcGF0aCEuZmlsZV9kb3dubG9hZCEsZmlsZU5hbWUhKVxyXG5cclxuICAgIGxldCBiZWdpbiA9IERhdGUubm93KCk7XHJcbiAgICBsZXQgZG93bmxvYWQgPSBhd2FpdCBzdGFja19kb3dubG9hZC50cmFucygpLmNyZWF0ZV90YXNrKCB7XHJcbiAgICAgICAgY29tbW9uOiAge1xyXG4gICAgICAgICAgICByZXFfcGF0aDogXCJxYVRlc3RcIixcclxuICAgICAgICAgICAgZGVjX2lkLFxyXG4gICAgICAgICAgICBsZXZlbDogY3lmcy5ORE5BUElMZXZlbC5Sb3V0ZXIsXHJcbiAgICAgICAgICAgIHRhcmdldCA6IHN0YWNrX2Rvd25sb2FkLmxvY2FsX2RldmljZV9pZCgpLm9iamVjdF9pZCxcclxuICAgICAgICAgICAgcmVmZXJlcl9vYmplY3Q6IFtuZXcgY3lmcy5ORE5EYXRhUmVmZXJlck9iamVjdCh0ZXN0X2ZpbGUpXSxcclxuICAgICAgICAgICAgZmxhZ3M6IDEsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBvYmplY3RfaWQ6IHRlc3RfZmlsZSxcclxuICAgICAgICBsb2NhbF9wYXRoOiBzYXZlX2ZpbGVQYXRoLFxyXG4gICAgICAgIGRldmljZV9saXN0OiBbc3RhY2tfdXBsb2FkLmxvY2FsX2RldmljZV9pZCgpXSxcclxuICAgICAgICBhdXRvX3N0YXJ0OiB0cnVlLFxyXG4gICAgfSlcclxuICAgIF9pbnRlcmZhY2UuZ2V0TG9nZ2VyKCkuaW5mbyhgIyMke2Rvd25sb2FkfWApXHJcbiAgICBsZXQgc2F2ZVBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLFwiLi4vLi4vRE1DX2Rvd25sb2FkLnR4dFwiKVxyXG4gICAgaWYoIWZzLnBhdGhFeGlzdHNTeW5jKHNhdmVQYXRoKSl7XHJcbiAgICAgICAgZnMuY3JlYXRlRmlsZVN5bmMoc2F2ZVBhdGgpXHJcbiAgICB9XHJcbiAgICBsZXQgZXJyb3JQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSxcIi4uLy4uL0RNQ19lcnJvci50eHRcIilcclxuICAgIGZzLnJlbW92ZVN5bmMoZXJyb3JQYXRoKTtcclxuICAgIGxldCBkb3dubG9hZF9pZCAgPSBkb3dubG9hZC51bndyYXAoKS50YXNrX2lkXHJcbiAgICBmb3IobGV0IGkgPTA7aTx0aW1lb3V0O2krKyl7XHJcbiAgICAgICAgbGV0IHRhc2sgPSBhd2FpdCBzdGFja19kb3dubG9hZC50cmFucygpLmdldF90YXNrX3N0YXRlKCB7XHJcbiAgICAgICAgICAgIGNvbW1vbjogIHtcclxuICAgICAgICAgICAgICAgIHJlcV9wYXRoOiBcInFhVGVzdFwiLFxyXG4gICAgICAgICAgICAgICAgZGVjX2lkLFxyXG4gICAgICAgICAgICAgICAgbGV2ZWw6IGN5ZnMuTkROQVBJTGV2ZWwuUm91dGVyLFxyXG4gICAgICAgICAgICAgICAgcmVmZXJlcl9vYmplY3Q6IFtdLFxyXG4gICAgICAgICAgICAgICAgZmxhZ3M6IDEsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRhc2tfaWQgOiBkb3dubG9hZF9pZFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGAjIyMjIyMjIOS8oOi+k+eKtuaAge+8miAke0pTT04uc3RyaW5naWZ5KHRhc2sudW53cmFwKCkpfWAgKTtcclxuICAgICAgICBsZXQgZmlsZSA9IGZzLmFwcGVuZEZpbGVTeW5jKHNhdmVQYXRoLGAgJHtKU09OLnN0cmluZ2lmeSh0YXNrLnVud3JhcCgpKX1cXG5gKVxyXG4gICAgICAgIGxldCBzdGF0ZSA9IHRhc2sudW53cmFwKCkuc3RhdGU7XHJcbiAgICAgICAgaWYoc3RhdGU9PTQpe1xyXG4gICAgICAgICAgICBfaW50ZXJmYWNlLmdldExvZ2dlcigpLmluZm8oYCMjIyMjIyMg5Lyg6L6T5a6M5oiQ77yaICR7SlNPTi5zdHJpbmdpZnkodGFzay51bndyYXAoKSl9ICx0aW1lID0gJHtEYXRlLm5vdygpIC0gYmVnaW59ICzmlofku7blpKflsI8gOiAke2ZpbGVTaXplfWAgKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLnN1Y2MsZmlsZUlkOnRlc3RfZmlsZS50b19iYXNlXzU4KCksdGltZTpEYXRlLm5vdygpIC0gYmVnaW4sZmlsZVNpemV9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHN0YXRlPT01KXtcclxuICAgICAgICAgICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGAjIyMjIyMjIOS8oOi+k+WujOaIkO+8miAke0pTT04uc3RyaW5naWZ5KHRhc2sudW53cmFwKCkpfSAsdGltZSA9ICR7RGF0ZS5ub3coKSAtIGJlZ2lufSAs5paH5Lu25aSn5bCPIDogJHtmaWxlU2l6ZX1gICk7XHJcbiAgICAgICAgICAgIGVycm9yX3RpbWUgPSBlcnJvcl90aW1lICsgMTtcclxuICAgICAgICAgICAgaWYoZXJyb3JfdGltZT4yMCl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUuZXhjZXB0aW9uLGZpbGVJZDp0ZXN0X2ZpbGUudG9fYmFzZV81OCgpLHRpbWU6RGF0ZS5ub3coKSAtIGJlZ2luLGZpbGVTaXplfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZzLmNyZWF0ZUZpbGVTeW5jKGVycm9yUGF0aCk7XHJcbiAgICAgICAgICAgIGZzLmFwcGVuZEZpbGVTeW5jKGVycm9yUGF0aCxgZmlsZUlkPSR7dGVzdF9maWxlLnRvX2Jhc2VfNTgoKX0jZmlsZU5hbWU9JHtmaWxlTmFtZX0jZXJyb3JfdGltZT0ke2Vycm9yX3RpbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLmV4Y2VwdGlvbixmaWxlSWQ6dGVzdF9maWxlLnRvX2Jhc2VfNTgoKSx0aW1lOkRhdGUubm93KCkgLSBiZWdpbixmaWxlU2l6ZX1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IGN5ZnMuc2xlZXAoMTAwMClcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS50aW1lb3V0LGZpbGVJZDp0ZXN0X2ZpbGUudG9fYmFzZV81OCgpLHRpbWU6RGF0ZS5ub3coKSAtIGJlZ2luLGZpbGVTaXplfVxyXG59XHJcblxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFRhc2tNYWluKF9pbnRlcmZhY2U6IFRhc2tDbGllbnRJbnRlcmZhY2UpIHtcclxuXHJcbiAgICBsZXQgZGVjX2lkID0gY3lmcy5PYmplY3RJZC5mcm9tX2Jhc2VfNTgoXCI5dEdwTE5uYWI5dVZ0amVhSzRiTTU5UUtTa0xFR1dvdzFwSnE2aGpqSzlNTVwiKS51bndyYXAoKTtcclxuICAgIGxldCBETUNfRG93bmxvYWQgPSBuZXcgU3RhY2tQcm94eUNsaWVudCh7XHJcbiAgICAgICAgX2ludGVyZmFjZSxcclxuICAgICAgICBwZWVyTmFtZTogXCJQQ18wMDA1XCIsIC8vIERNQ19Eb3dubG9hZFxyXG4gICAgICAgIHN0YWNrX3R5cGU6IFwib29kXCIsXHJcbiAgICAgICAgdGltZW91dDogNjAgKiAxMDAwLFxyXG4gICAgICAgIHdzX3BvcnQ6IDIwMDAxLFxyXG4gICAgICAgIGh0dHBfcG9ydDogMjAwMDIgIFxyXG4gICAgfSlcclxuICAgIGF3YWl0IERNQ19Eb3dubG9hZC5pbml0KCk7XHJcbiAgICBsZXQgRE1DX1VwbG9hZCA9IG5ldyBTdGFja1Byb3h5Q2xpZW50KHtcclxuICAgICAgICBfaW50ZXJmYWNlLFxyXG4gICAgICAgIHBlZXJOYW1lOiBcIlBDXzAwMThcIiwgIC8vIERNQ19VcGxvYWRcclxuICAgICAgICBzdGFja190eXBlOiBcIm9vZFwiLFxyXG4gICAgICAgIHRpbWVvdXQ6IDYwICogMTAwMCxcclxuICAgICAgICB3c19wb3J0OiAyMDAwMyxcclxuICAgICAgICBodHRwX3BvcnQ6IDIwMDA0XHJcbiAgICB9KVxyXG4gICAgYXdhaXQgRE1DX1VwbG9hZC5pbml0KCk7XHJcbiAgICBcclxuICAgIF9pbnRlcmZhY2UuZ2V0TG9nZ2VyKCkuaW5mbyhgV2FpdGluZyBmb3IgcHJveHkgdG8gY29ubmVjdGlvbi4uLmApO1xyXG4gICAgbGV0IHN0YWNrX2Rvd25sb2FkID0gY3lmcy5TaGFyZWRDeWZzU3RhY2sub3BlbihjeWZzLlNoYXJlZEN5ZnNTdGFja1BhcmFtLm5ld193aXRoX3dzX2V2ZW50X3BvcnRzKDIwMDAyLCAyMDAwMSxkZWNfaWQpLnVud3JhcCgpKVxyXG4gICAgbGV0IHJlc3AgPSBhd2FpdCBzdGFja19kb3dubG9hZC53YWl0X29ubGluZShjeWZzLk5vbmUpO1xyXG4gICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGB3YWl0X29ubGluZSBmaW5pc2hlZCAke0pTT04uc3RyaW5naWZ5KHJlc3AudW53cmFwKCkpfWApO1xyXG4gICAgbGV0IHJlcyA9IGF3YWl0IHN0YWNrX2Rvd25sb2FkLnV0aWwoKS5nZXRfem9uZSh7IGNvbW1vbjogeyBmbGFnczogMCB9IH0pO1xyXG4gICAgbGV0IHN0YWNrX3VwbG9hZCA9IGN5ZnMuU2hhcmVkQ3lmc1N0YWNrLm9wZW4oY3lmcy5TaGFyZWRDeWZzU3RhY2tQYXJhbS5uZXdfd2l0aF93c19ldmVudF9wb3J0cygyMDAwNCwgMjAwMDMsZGVjX2lkKS51bndyYXAoKSlcclxuICAgIGxldCByZXNwMiA9IGF3YWl0IHN0YWNrX3VwbG9hZC53YWl0X29ubGluZShjeWZzLk5vbmUpO1xyXG4gICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGB3YWl0X29ubGluZSBmaW5pc2hlZCAke0pTT04uc3RyaW5naWZ5KHJlc3AudW53cmFwKCkpfWApO1xyXG4gICAgbGV0IHJlczIgPSBhd2FpdCBzdGFja191cGxvYWQudXRpbCgpLmdldF96b25lKHsgY29tbW9uOiB7IGZsYWdzOiAwIH0gfSk7XHJcbiAgICBsZXQgZXJyb3JQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSxcIi4uLy4uL0RNQ19lcnJvci50eHRcIilcclxuICAgIGxldCBmaWxlU2l6ZSA9IDUwKjEwMjQqMTAyNDtcclxuICAgIGlmKGZzLnBhdGhFeGlzdHNTeW5jKGVycm9yUGF0aCkpe1xyXG4gICAgICAgIGxldCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKGVycm9yUGF0aCkudG9TdHJpbmcoKTtcclxuICAgICAgICBsZXQgZmlsZUlkX3N0ciA9IGRhdGEuc3BsaXQoXCIjXCIpWzBdLnNwbGl0KFwiPVwiKVsxXVxyXG4gICAgICAgIGxldCBmaWxlTmFtZSA9IGRhdGEuc3BsaXQoXCIjXCIpWzFdLnNwbGl0KFwiPVwiKVsxXVxyXG4gICAgICAgIGxldCBlcnJvcl90aW1lID0gTnVtYmVyKGRhdGEuc3BsaXQoXCIjXCIpWzJdLnNwbGl0KFwiPVwiKVsxXSkgXHJcbiAgICAgICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGBmaWxlSWRfc3RyID0gJHtmaWxlSWRfc3RyfSAgZmlsZU5hbWUgPSAke2ZpbGVOYW1lfSBlcnJvcl90aW1lID0ke2Vycm9yX3RpbWV9YClcclxuICAgICAgICBsZXQgZmlsZUlkID0gY3lmcy5PYmplY3RJZC5mcm9tX2Jhc2VfNTgoZmlsZUlkX3N0cikudW53cmFwKCk7XHJcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0ICBkb3dubG9hZChfaW50ZXJmYWNlLERNQ19Eb3dubG9hZCxzdGFja19kb3dubG9hZCxzdGFja191cGxvYWQsZmlsZVNpemUsNDAwLGZpbGVJZCxmaWxlTmFtZSxlcnJvcl90aW1lKTtcclxuICAgICAgICBhd2FpdCBfaW50ZXJmYWNlLmV4aXQoQ2xpZW50RXhpdENvZGUuZmFpbGVkLCBgJHtyZXN1bHR9YClcclxuICAgIH1cclxuICAgIGxldCByZXN1bHQgPSBhd2FpdCB0ZXN0X2ZpbGUoX2ludGVyZmFjZSxETUNfRG93bmxvYWQsRE1DX1VwbG9hZCxzdGFja19kb3dubG9hZCxzdGFja191cGxvYWQsZmlsZVNpemUsNDAwKTtcclxuICAgIFxyXG4gICAgYXdhaXQgX2ludGVyZmFjZS5leGl0KENsaWVudEV4aXRDb2RlLmZhaWxlZCwgYCR7cmVzdWx0fWApXHJcbn1cclxuIl19
