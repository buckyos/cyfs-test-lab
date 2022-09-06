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
    while(true){
        await cyfs.sleep(5000)
    }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvdGFza3MvRE1DX2RlYnVnZXJfNTBNQi9vbmxvYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHFDQUFxTDtBQUNyTCwyQ0FBNEI7QUFDNUIsMkVBQThFO0FBQzlFLGtGQUFtRTtBQUNuRSw2Q0FBK0I7QUFHL0IsS0FBSyxVQUFVLFNBQVMsQ0FBQyxVQUErQixFQUFDLFlBQTZCLEVBQUMsVUFBMkIsRUFBQyxjQUFtQyxFQUFDLFlBQWlDLEVBQUMsUUFBZSxFQUFDLE9BQWM7SUFDbk4sSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsOENBQThDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUVqRyxJQUFJLFVBQVUsR0FBRyxNQUFNLFVBQVUsQ0FBQyxXQUFZLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BFLElBQUksUUFBUSxHQUFHLE1BQU0sWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLFlBQVksQ0FBQztRQUNuRCxNQUFNLEVBQUU7WUFDSixRQUFRLEVBQUUsUUFBUTtZQUNsQixRQUFRO1lBQ1IsUUFBUTtZQUNSLE1BQU07WUFDTixLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHO1lBQzNCLE1BQU0sRUFBRyxZQUFZLENBQUMsZUFBZSxFQUFFLENBQUMsU0FBUztZQUNqRCxhQUFhO1lBQ2IsOEJBQThCO1lBQzlCLGNBQWMsRUFBRSxFQUFFO1lBQ2xCLEtBQUssRUFBRSxDQUFDO1NBQ1g7UUFDRCxLQUFLLEVBQUUsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFDLFNBQVM7UUFDL0MsVUFBVSxFQUFFLFVBQVUsQ0FBQyxRQUFTO1FBQ2hDLFVBQVUsRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUk7S0FDOUIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFB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LGNBQWMsRUFBQyxZQUFZLEVBQUMsUUFBUSxFQUFDLEdBQUcsRUFBQyxNQUFNLEVBQUMsUUFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFILE1BQU0sVUFBVSxDQUFDLElBQUksQ0FBQyxxQkFBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDLENBQUE7S0FDNUQ7SUFDRCxJQUFJLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUMsWUFBWSxFQUFDLFVBQVUsRUFBQyxjQUFjLEVBQUMsWUFBWSxFQUFDLFFBQVEsRUFBQyxHQUFHLENBQUMsQ0FBQztJQUUxRyxNQUFNLFVBQVUsQ0FBQyxJQUFJLENBQUMscUJBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0FBQzdELENBQUM7QUE5Q0QsNEJBOENDIiwiZmlsZSI6InRhc2tzL0RNQ19kZWJ1Z2VyXzUwTUIvb25sb2FkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXJyb3JDb2RlLCBOZXRFbnRyeSwgTmFtZXNwYWNlLCBBY2Nlc3NOZXRUeXBlLCBCdWZmZXJSZWFkZXIsIExvZ2dlciwgVGFza0NsaWVudEludGVyZmFjZSwgQ2xpZW50RXhpdENvZGUsIEJ1ZmZlcldyaXRlciwgUmFuZG9tR2VuZXJhdG9yLCBIdHRwRG93bmxvYWRlciB9IGZyb20gJy4uLy4uL2Jhc2UnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCJcclxuaW1wb3J0IHsgU3RhY2tQcm94eUNsaWVudCB9IGZyb20gXCIuLi8uLi90YXNrVG9vbHMvY3lmc19zdGFja190dW5uZWwvc3RhY2tUb29sXCJcclxuaW1wb3J0ICogYXMgY3lmcyBmcm9tIFwiLi4vLi4vdGFza1Rvb2xzL2N5ZnNfc3RhY2tfdHVubmVsL2N5ZnNfbm9kZVwiXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy1leHRyYVwiOyBcclxuXHJcblxyXG5hc3luYyBmdW5jdGlvbiB0ZXN0X2ZpbGUoX2ludGVyZmFjZTogVGFza0NsaWVudEludGVyZmFjZSxETUNfRG93bmxvYWQ6U3RhY2tQcm94eUNsaWVudCxETUNfVXBsb2FkOlN0YWNrUHJveHlDbGllbnQsc3RhY2tfZG93bmxvYWQ6Y3lmcy5TaGFyZWRDeWZzU3RhY2ssc3RhY2tfdXBsb2FkOmN5ZnMuU2hhcmVkQ3lmc1N0YWNrLGZpbGVTaXplOm51bWJlcix0aW1lb3V0Om51bWJlcikge1xyXG4gICAgbGV0IGRlY19pZCA9IGN5ZnMuT2JqZWN0SWQuZnJvbV9iYXNlXzU4KFwiOXRHcExObmFiOXVWdGplYUs0Yk01OVFLU2tMRUdXb3cxcEpxNmhqaks5TU1cIikudW53cmFwKCk7XHJcbiAgIFxyXG4gICAgbGV0IGNyZWF0ZUZpbGUgPSBhd2FpdCBETUNfVXBsb2FkLnV0aWxfY2xpZW50IS5jcmVhdGVGaWxlKGZpbGVTaXplKTtcclxuICAgIGxldCBhZGRfZmlsZSA9IGF3YWl0IHN0YWNrX3VwbG9hZC50cmFucygpLnB1Ymxpc2hfZmlsZSh7XHJcbiAgICAgICAgY29tbW9uOiB7Ly8g6K+35rGC6Lev5b6E77yM5Y+v5Li656m6XHJcbiAgICAgICAgICAgIHJlcV9wYXRoOiBcInFhVGVzdFwiLFxyXG4gICAgICAgICAgICAvLyDmnaXmupBERUNcclxuICAgICAgICAgICAgLy8gYXBp57qn5YirXHJcbiAgICAgICAgICAgIGRlY19pZCxcclxuICAgICAgICAgICAgbGV2ZWw6IGN5ZnMuTkROQVBJTGV2ZWwuTkROLFxyXG4gICAgICAgICAgICB0YXJnZXQgOiBzdGFja191cGxvYWQubG9jYWxfZGV2aWNlX2lkKCkub2JqZWN0X2lkLFxyXG4gICAgICAgICAgICAvLyB0YXJncnTorr7lpIflj4LmlbBcclxuICAgICAgICAgICAgLy8g6ZyA6KaB5aSE55CG5pWw5o2u55qE5YWz6IGU5a+56LGh77yM5Li76KaB55So5LulY2h1bmsvZmlsZeetiVxyXG4gICAgICAgICAgICByZWZlcmVyX29iamVjdDogW10sXHJcbiAgICAgICAgICAgIGZsYWdzOiAxLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb3duZXI6IHN0YWNrX3VwbG9hZC5sb2NhbF9kZXZpY2VfaWQoKS5vYmplY3RfaWQsXHJcbiAgICAgICAgbG9jYWxfcGF0aDogY3JlYXRlRmlsZS5maWxlUGF0aCEsXHJcbiAgICAgICAgY2h1bmtfc2l6ZTogNCAqIDEwMjQgKiAxMDI0XHJcbiAgICB9KTtcclxuICAgXHJcbiAgICBsZXQgdGVzdF9maWxlID0gYWRkX2ZpbGUudW53cmFwKCkuZmlsZV9pZFxyXG4gICAgbGV0IHRhc2tfaWQ6IHN0cmluZztcclxuICAgIGF3YWl0IGN5ZnMuc2xlZXAoMTAwMClcclxuXHJcbiAgICBjb25zdCByZXExOiBjeWZzLk5PTkdldE9iamVjdE91dHB1dFJlcXVlc3QgPSB7XHJcbiAgICAgICAgb2JqZWN0X2lkOiB0ZXN0X2ZpbGUsXHJcbiAgICAgICAgY29tbW9uOiB7XHJcbiAgICAgICAgICAgIHJlcV9wYXRoOiBcInFhVGVzdFwiLFxyXG4gICAgICAgICAgICBsZXZlbDogY3lmcy5OT05BUElMZXZlbC5OT04sXHJcbiAgICAgICAgICAgIHRhcmdldDogc3RhY2tfdXBsb2FkLmxvY2FsX2RldmljZV9pZCgpLm9iamVjdF9pZCxcclxuICAgICAgICAgICAgZGVjX2lkLFxyXG4gICAgICAgICAgICBmbGFnczogMCxcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgY29uc3QgZ2V0X3JldCA9IGF3YWl0IHN0YWNrX3VwbG9hZC5ub25fc2VydmljZSgpLmdldF9vYmplY3QocmVxMSk7XHJcbiAgICBsZXQgZmlsZV9vYmogPSBnZXRfcmV0LnVud3JhcCgpLm9iamVjdDtcclxuICAgIGxldCBzdHJlYW0gPSBhd2FpdCBzdGFja191cGxvYWQubm9uX3NlcnZpY2UoKS5wdXRfb2JqZWN0KHtcclxuICAgICAgICBjb21tb246IHtcclxuICAgICAgICAgICAgZGVjX2lkLFxyXG4gICAgICAgICAgICBmbGFnczogMCxcclxuICAgICAgICAgICAgdGFyZ2V0OiBzdGFja19kb3dubG9hZC5sb2NhbF9kZXZpY2VfaWQoKS5vYmplY3RfaWQsXHJcbiAgICAgICAgICAgIGxldmVsOiBjeWZzLk5PTkFQSUxldmVsLlJvdXRlciAvL+iuvue9rui3r+eUseexu+Wei1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb2JqZWN0OiBuZXcgY3lmcy5OT05PYmplY3RJbmZvKHRlc3RfZmlsZSwgZmlsZV9vYmoub2JqZWN0X3JhdylcclxuICAgIH0pXHJcbiAgICBfaW50ZXJmYWNlLmdldExvZ2dlcigpLmluZm8oYCMjIyMjICR7SlNPTi5zdHJpbmdpZnkoc3RyZWFtLnVud3JhcCgpLnJlc3VsdCkgfWApXHJcbiAgICBhd2FpdCBjeWZzLnNsZWVwKDEwMDApXHJcbiAgICBfaW50ZXJmYWNlLmdldExvZ2dlcigpLmluZm8oXCLojrflj5Z0YXNrIG9iamVjdFwiKTtcclxuICAgIGNvbnN0IHJlcTI6IGN5ZnMuTk9OR2V0T2JqZWN0T3V0cHV0UmVxdWVzdCA9IHtcclxuICAgICAgICBvYmplY3RfaWQ6dGVzdF9maWxlLFxyXG4gICAgICAgIGNvbW1vbjoge1xyXG4gICAgICAgICAgICByZXFfcGF0aDogXCJxYVRlc3RcIixcclxuICAgICAgICAgICAgbGV2ZWw6IGN5ZnMuTk9OQVBJTGV2ZWwuUm91dGVyLFxyXG4gICAgICAgICAgICB0YXJnZXQgOnN0YWNrX3VwbG9hZC5sb2NhbF9kZXZpY2VfaWQoKS5vYmplY3RfaWQsXHJcbiAgICAgICAgICAgIGRlY19pZCxcclxuICAgICAgICAgICAgZmxhZ3M6IDAsXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIGNvbnN0IGdldF9yZXQyID0gYXdhaXQgc3RhY2tfZG93bmxvYWQubm9uX3NlcnZpY2UoKS5nZXRfb2JqZWN0KHJlcTIpO1xyXG4gICAgZ2V0X3JldDIudW53cmFwKCkub2JqZWN0XHJcbiAgICBsZXQgc2F2ZVBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLFwiLi4vLi4vRE1DLnR4dFwiKVxyXG4gICAgaWYoIWZzLnBhdGhFeGlzdHNTeW5jKHNhdmVQYXRoKSl7XHJcbiAgICAgICAgZnMuY3JlYXRlRmlsZVN5bmMoc2F2ZVBhdGgpXHJcbiAgICB9XHJcbiAgICBcclxuICAgIF9pbnRlcmZhY2UuZ2V0TG9nZ2VyKCkuaW5mbyhgJHtKU09OLnN0cmluZ2lmeShnZXRfcmV0MikgfWApXHJcbiAgICBmb3IobGV0IGk9MDtpPDE7aSsrKXtcclxuICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgZG93bmxvYWQoX2ludGVyZmFjZSxETUNfRG93bmxvYWQsc3RhY2tfZG93bmxvYWQsc3RhY2tfdXBsb2FkLGZpbGVTaXplLHRpbWVvdXQsdGVzdF9maWxlLGNyZWF0ZUZpbGUuZmlsZU5hbWUhKVxyXG4gICAgICAgIGxldCBmaWxlID0gZnMuYXBwZW5kRmlsZVN5bmMoc2F2ZVBhdGgsYCR7SlNPTi5zdHJpbmdpZnkocmVzdWx0KX1cXG5gKVxyXG4gICAgICAgIGlmKHJlc3VsdC5lcnIgPT0gRXJyb3JDb2RlLnN1Y2Mpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gIGRvd25sb2FkKF9pbnRlcmZhY2U6IFRhc2tDbGllbnRJbnRlcmZhY2UsRE1DX0Rvd25sb2FkOlN0YWNrUHJveHlDbGllbnQsc3RhY2tfZG93bmxvYWQ6Y3lmcy5TaGFyZWRDeWZzU3RhY2ssc3RhY2tfdXBsb2FkOmN5ZnMuU2hhcmVkQ3lmc1N0YWNrLGZpbGVTaXplOm51bWJlcix0aW1lb3V0Om51bWJlcix0ZXN0X2ZpbGU6Y3lmcy5PYmplY3RJZCxmaWxlTmFtZTpzdHJpbmcsZXJyb3JfdGltZTpudW1iZXI9MCl7XHJcbiAgICBsZXQgZGVjX2lkID0gY3lmcy5PYmplY3RJZC5mcm9tX2Jhc2VfNTgoXCI5dEdwTE5uYWI5dVZ0amVhSzRiTTU5UUtTa0xFR1dvdzFwSnE2aGpqSzlNTVwiKS51bndyYXAoKTtcclxuICAgIGxldCBkb3dubG9hZF9wYXRoID0gYXdhaXQgRE1DX0Rvd25sb2FkLnV0aWxfY2xpZW50IS5nZXRDYWNoZVBhdGgoKTtcclxuICAgIGxldCBzYXZlX2ZpbGVQYXRoID0gIHBhdGguam9pbiggZG93bmxvYWRfcGF0aC5jYWNoZV9wYXRoIS5maWxlX2Rvd25sb2FkISxmaWxlTmFtZSEpXHJcblxyXG4gICAgbGV0IGJlZ2luID0gRGF0ZS5ub3coKTtcclxuICAgIGxldCBkb3dubG9hZCA9IGF3YWl0IHN0YWNrX2Rvd25sb2FkLnRyYW5zKCkuY3JlYXRlX3Rhc2soIHtcclxuICAgICAgICBjb21tb246ICB7XHJcbiAgICAgICAgICAgIHJlcV9wYXRoOiBcInFhVGVzdFwiLFxyXG4gICAgICAgICAgICBkZWNfaWQsXHJcbiAgICAgICAgICAgIGxldmVsOiBjeWZzLk5ETkFQSUxldmVsLlJvdXRlcixcclxuICAgICAgICAgICAgdGFyZ2V0IDogc3RhY2tfZG93bmxvYWQubG9jYWxfZGV2aWNlX2lkKCkub2JqZWN0X2lkLFxyXG4gICAgICAgICAgICByZWZlcmVyX29iamVjdDogW25ldyBjeWZzLk5ETkRhdGFSZWZlcmVyT2JqZWN0KHRlc3RfZmlsZSldLFxyXG4gICAgICAgICAgICBmbGFnczogMSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9iamVjdF9pZDogdGVzdF9maWxlLFxyXG4gICAgICAgIGxvY2FsX3BhdGg6IHNhdmVfZmlsZVBhdGgsXHJcbiAgICAgICAgZGV2aWNlX2xpc3Q6IFtzdGFja191cGxvYWQubG9jYWxfZGV2aWNlX2lkKCldLFxyXG4gICAgICAgIGF1dG9fc3RhcnQ6IHRydWUsXHJcbiAgICB9KVxyXG4gICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGAjIyR7ZG93bmxvYWR9YClcclxuICAgIGxldCBzYXZlUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsXCIuLi8uLi9ETUNfZG93bmxvYWQudHh0XCIpXHJcbiAgICBpZighZnMucGF0aEV4aXN0c1N5bmMoc2F2ZVBhdGgpKXtcclxuICAgICAgICBmcy5jcmVhdGVGaWxlU3luYyhzYXZlUGF0aClcclxuICAgIH1cclxuICAgIGxldCBlcnJvclBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLFwiLi4vLi4vRE1DX2Vycm9yLnR4dFwiKVxyXG4gICAgZnMucmVtb3ZlU3luYyhlcnJvclBhdGgpO1xyXG4gICAgbGV0IGRvd25sb2FkX2lkICA9IGRvd25sb2FkLnVud3JhcCgpLnRhc2tfaWRcclxuICAgIGZvcihsZXQgaSA9MDtpPHRpbWVvdXQ7aSsrKXtcclxuICAgICAgICBsZXQgdGFzayA9IGF3YWl0IHN0YWNrX2Rvd25sb2FkLnRyYW5zKCkuZ2V0X3Rhc2tfc3RhdGUoIHtcclxuICAgICAgICAgICAgY29tbW9uOiAge1xyXG4gICAgICAgICAgICAgICAgcmVxX3BhdGg6IFwicWFUZXN0XCIsXHJcbiAgICAgICAgICAgICAgICBkZWNfaWQsXHJcbiAgICAgICAgICAgICAgICBsZXZlbDogY3lmcy5ORE5BUElMZXZlbC5Sb3V0ZXIsXHJcbiAgICAgICAgICAgICAgICByZWZlcmVyX29iamVjdDogW10sXHJcbiAgICAgICAgICAgICAgICBmbGFnczogMSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGFza19pZCA6IGRvd25sb2FkX2lkXHJcbiAgICAgICAgfSlcclxuICAgICAgICBfaW50ZXJmYWNlLmdldExvZ2dlcigpLmluZm8oYCMjIyMjIyMg5Lyg6L6T54q25oCB77yaICR7SlNPTi5zdHJpbmdpZnkodGFzay51bndyYXAoKSl9YCApO1xyXG4gICAgICAgIGxldCBmaWxlID0gZnMuYXBwZW5kRmlsZVN5bmMoc2F2ZVBhdGgsYCAke0pTT04uc3RyaW5naWZ5KHRhc2sudW53cmFwKCkpfVxcbmApXHJcbiAgICAgICAgbGV0IHN0YXRlID0gdGFzay51bndyYXAoKS5zdGF0ZTtcclxuICAgICAgICBpZihzdGF0ZT09NCl7XHJcbiAgICAgICAgICAgIF9pbnRlcmZhY2UuZ2V0TG9nZ2VyKCkuaW5mbyhgIyMjIyMjIyDkvKDovpPlrozmiJDvvJogJHtKU09OLnN0cmluZ2lmeSh0YXNrLnVud3JhcCgpKX0gLHRpbWUgPSAke0RhdGUubm93KCkgLSBiZWdpbn0gLOaWh+S7tuWkp+WwjyA6ICR7ZmlsZVNpemV9YCApO1xyXG4gICAgICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUuc3VjYyxmaWxlSWQ6dGVzdF9maWxlLnRvX2Jhc2VfNTgoKSx0aW1lOkRhdGUubm93KCkgLSBiZWdpbixmaWxlU2l6ZX1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoc3RhdGU9PTUpe1xyXG4gICAgICAgICAgICBfaW50ZXJmYWNlLmdldExvZ2dlcigpLmluZm8oYCMjIyMjIyMg5Lyg6L6T5a6M5oiQ77yaICR7SlNPTi5zdHJpbmdpZnkodGFzay51bndyYXAoKSl9ICx0aW1lID0gJHtEYXRlLm5vdygpIC0gYmVnaW59ICzmlofku7blpKflsI8gOiAke2ZpbGVTaXplfWAgKTtcclxuICAgICAgICAgICAgZXJyb3JfdGltZSA9IGVycm9yX3RpbWUgKyAxO1xyXG4gICAgICAgICAgICBpZihlcnJvcl90aW1lPjIwKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS5leGNlcHRpb24sZmlsZUlkOnRlc3RfZmlsZS50b19iYXNlXzU4KCksdGltZTpEYXRlLm5vdygpIC0gYmVnaW4sZmlsZVNpemV9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZnMuY3JlYXRlRmlsZVN5bmMoZXJyb3JQYXRoKTtcclxuICAgICAgICAgICAgZnMuYXBwZW5kRmlsZVN5bmMoZXJyb3JQYXRoLGBmaWxlSWQ9JHt0ZXN0X2ZpbGUudG9fYmFzZV81OCgpfSNmaWxlTmFtZT0ke2ZpbGVOYW1lfSNlcnJvcl90aW1lPSR7ZXJyb3JfdGltZX1gKVxyXG4gICAgICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUuZXhjZXB0aW9uLGZpbGVJZDp0ZXN0X2ZpbGUudG9fYmFzZV81OCgpLHRpbWU6RGF0ZS5ub3coKSAtIGJlZ2luLGZpbGVTaXplfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgY3lmcy5zbGVlcCgxMDAwKVxyXG4gICAgfVxyXG4gICAgXHJcblxyXG4gICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLnRpbWVvdXQsZmlsZUlkOnRlc3RfZmlsZS50b19iYXNlXzU4KCksdGltZTpEYXRlLm5vdygpIC0gYmVnaW4sZmlsZVNpemV9XHJcbn1cclxuXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gVGFza01haW4oX2ludGVyZmFjZTogVGFza0NsaWVudEludGVyZmFjZSkge1xyXG5cclxuICAgIGxldCBkZWNfaWQgPSBjeWZzLk9iamVjdElkLmZyb21fYmFzZV81OChcIjl0R3BMTm5hYjl1VnRqZWFLNGJNNTlRS1NrTEVHV293MXBKcTZoampLOU1NXCIpLnVud3JhcCgpO1xyXG4gICAgbGV0IERNQ19Eb3dubG9hZCA9IG5ldyBTdGFja1Byb3h5Q2xpZW50KHtcclxuICAgICAgICBfaW50ZXJmYWNlLFxyXG4gICAgICAgIHBlZXJOYW1lOiBcIlBDXzAwMDVcIiwgLy9ETUNfRG93bmxvYWRcclxuICAgICAgICBzdGFja190eXBlOiBcIm9vZFwiLFxyXG4gICAgICAgIHRpbWVvdXQ6IDYwICogMTAwMCxcclxuICAgICAgICB3c19wb3J0OiAyMDAwMSxcclxuICAgICAgICBodHRwX3BvcnQ6IDIwMDAyICBcclxuICAgIH0pXHJcbiAgICBhd2FpdCBETUNfRG93bmxvYWQuaW5pdCgpO1xyXG4gICAgbGV0IERNQ19VcGxvYWQgPSBuZXcgU3RhY2tQcm94eUNsaWVudCh7XHJcbiAgICAgICAgX2ludGVyZmFjZSxcclxuICAgICAgICBwZWVyTmFtZTogXCJQQ18wMDE4XCIsICAvL0RNQ19VcGxvYWRcclxuICAgICAgICBzdGFja190eXBlOiBcIm9vZFwiLFxyXG4gICAgICAgIHRpbWVvdXQ6IDYwICogMTAwMCxcclxuICAgICAgICB3c19wb3J0OiAyMDAwMyxcclxuICAgICAgICBodHRwX3BvcnQ6IDIwMDA0XHJcbiAgICB9KVxyXG4gICAgYXdhaXQgRE1DX1VwbG9hZC5pbml0KCk7XHJcbiAgICBcclxuICAgIF9pbnRlcmZhY2UuZ2V0TG9nZ2VyKCkuaW5mbyhgV2FpdGluZyBmb3IgcHJveHkgdG8gY29ubmVjdGlvbi4uLmApO1xyXG4gICAgbGV0IHN0YWNrX2Rvd25sb2FkID0gY3lmcy5TaGFyZWRDeWZzU3RhY2sub3BlbihjeWZzLlNoYXJlZEN5ZnNTdGFja1BhcmFtLm5ld193aXRoX3dzX2V2ZW50X3BvcnRzKDIwMDAyLCAyMDAwMSxkZWNfaWQpLnVud3JhcCgpKVxyXG4gICAgbGV0IHJlc3AgPSBhd2FpdCBzdGFja19kb3dubG9hZC53YWl0X29ubGluZShjeWZzLk5vbmUpO1xyXG4gICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGB3YWl0X29ubGluZSBmaW5pc2hlZCAke0pTT04uc3RyaW5naWZ5KHJlc3AudW53cmFwKCkpfWApO1xyXG4gICAgbGV0IHJlcyA9IGF3YWl0IHN0YWNrX2Rvd25sb2FkLnV0aWwoKS5nZXRfem9uZSh7IGNvbW1vbjogeyBmbGFnczogMCB9IH0pO1xyXG4gICAgbGV0IHN0YWNrX3VwbG9hZCA9IGN5ZnMuU2hhcmVkQ3lmc1N0YWNrLm9wZW4oY3lmcy5TaGFyZWRDeWZzU3RhY2tQYXJhbS5uZXdfd2l0aF93c19ldmVudF9wb3J0cygyMDAwNCwgMjAwMDMsZGVjX2lkKS51bndyYXAoKSlcclxuICAgIGxldCByZXNwMiA9IGF3YWl0IHN0YWNrX3VwbG9hZC53YWl0X29ubGluZShjeWZzLk5vbmUpO1xyXG4gICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGB3YWl0X29ubGluZSBmaW5pc2hlZCAke0pTT04uc3RyaW5naWZ5KHJlc3AudW53cmFwKCkpfWApO1xyXG4gICAgbGV0IHJlczIgPSBhd2FpdCBzdGFja191cGxvYWQudXRpbCgpLmdldF96b25lKHsgY29tbW9uOiB7IGZsYWdzOiAwIH0gfSk7XHJcbiAgICBsZXQgZXJyb3JQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSxcIi4uLy4uL0RNQ19lcnJvci50eHRcIilcclxuICAgIGxldCBmaWxlU2l6ZSA9IDUwKjEwMjQqMTAyNDtcclxuICAgIGlmKGZzLnBhdGhFeGlzdHNTeW5jKGVycm9yUGF0aCkpe1xyXG4gICAgICAgIGxldCBkYXRhID0gZnMucmVhZEZpbGVTeW5jKGVycm9yUGF0aCkudG9TdHJpbmcoKTtcclxuICAgICAgICBsZXQgZmlsZUlkX3N0ciA9IGRhdGEuc3BsaXQoXCIjXCIpWzBdLnNwbGl0KFwiPVwiKVsxXVxyXG4gICAgICAgIGxldCBmaWxlTmFtZSA9IGRhdGEuc3BsaXQoXCIjXCIpWzFdLnNwbGl0KFwiPVwiKVsxXVxyXG4gICAgICAgIGxldCBlcnJvcl90aW1lID0gTnVtYmVyKGRhdGEuc3BsaXQoXCIjXCIpWzJdLnNwbGl0KFwiPVwiKVsxXSkgXHJcbiAgICAgICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5pbmZvKGBmaWxlSWRfc3RyID0gJHtmaWxlSWRfc3RyfSAgZmlsZU5hbWUgPSAke2ZpbGVOYW1lfSBlcnJvcl90aW1lID0ke2Vycm9yX3RpbWV9YClcclxuICAgICAgICBsZXQgZmlsZUlkID0gY3lmcy5PYmplY3RJZC5mcm9tX2Jhc2VfNTgoZmlsZUlkX3N0cikudW53cmFwKCk7XHJcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0ICBkb3dubG9hZChfaW50ZXJmYWNlLERNQ19Eb3dubG9hZCxzdGFja19kb3dubG9hZCxzdGFja191cGxvYWQsZmlsZVNpemUsNDAwLGZpbGVJZCxmaWxlTmFtZSxlcnJvcl90aW1lKTtcclxuICAgICAgICBhd2FpdCBfaW50ZXJmYWNlLmV4aXQoQ2xpZW50RXhpdENvZGUuZmFpbGVkLCBgJHtyZXN1bHR9YClcclxuICAgIH1cclxuICAgIGxldCByZXN1bHQgPSBhd2FpdCB0ZXN0X2ZpbGUoX2ludGVyZmFjZSxETUNfRG93bmxvYWQsRE1DX1VwbG9hZCxzdGFja19kb3dubG9hZCxzdGFja191cGxvYWQsZmlsZVNpemUsNDAwKTtcclxuICAgIFxyXG4gICAgYXdhaXQgX2ludGVyZmFjZS5leGl0KENsaWVudEV4aXRDb2RlLmZhaWxlZCwgYCR7cmVzdWx0fWApXHJcbn1cclxuIl19
