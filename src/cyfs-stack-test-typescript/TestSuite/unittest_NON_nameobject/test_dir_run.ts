import * as cyfs from '../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, run, decoder, DeleteDescFile } from './index';
import JSBI from 'jsbi';
var assert = require("assert");

//Dir对象测试
describe("测试Dir对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let chunkidstr = 'VPmDB24kffjooYGWkKNQabKhA1VQUbjiSFDqawPEp2Z'
    let lenstr = '14735389615'
    let filepath = descpath('Dir1');
    let filepath1 = descpath('Dir2');

    let objectid = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
    let chunkid = cyfs.ChunkId.from_base_58(chunkidstr)
    let attributes = new cyfs.Attributes(0)

    //定义传入的Body值
    let desc_buffer = decoder(__dirname + '/test-tool/tool/test_config/test_dir_test.fileobj')
    let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();
    let fileid = target.desc().calculate_id()
    let buckybuffer = new cyfs.BuckyBuffer(desc_buffer)

    let body_obj_list = new cyfs.BuckyHashMap<cyfs.ObjectId, cyfs.BuckyBuffer>()
    body_obj_list.set(fileid, buckybuffer)
    let body = {
        // "chunk_id":chunkid,
        chunk_id: undefined,
        // "obj_list":undefined,
        obj_list: body_obj_list
    }

    //定义InnerNode类型   
    let index = { offset: 111, size: 123 }
    let id = {
        object_id: fileid,
        // "chunk_id":chunkid,
        // "index":index,
        // "object_id":undefined,
        chunk_id: undefined,
        index: undefined
    }
    let node = new cyfs.InnerNode(id)

    //定义InnerNodeInfo类型
    let innernodeinfo = new cyfs.InnerNodeInfo(attributes, node)

    //定义NDNObjectList类型
    let path1 = 'test.txt'
    let buckystring = new cyfs.BuckyString(path1)
    let object_map = new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.InnerNodeInfo>()
    object_map.set(buckystring, innernodeinfo)
    let obj_list = new cyfs.NDNObjectList(
        cyfs.None,
        // cyfs.Some(chunkid),
        object_map
    )

    //定义NDNObjectInfo类型所需的info
    let info = {
        chunk_id: undefined,
        // 'obj_list':undefined
        // 'chunk_id':chunkid,
        obj_list: obj_list
    }


    describe("编码", function () {
        it("Ts编码：有效传入owner,attributes,body,NDNObjectInfo参数-编码", async function () {
            let Dir = cyfs.Dir.create(
                objectid,
                attributes,
                new cyfs.NDNObjectInfo(info),
                body,
            )
            fs.writeFileSync(filepath, Dir.to_vec().unwrap());
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let Dir = cyfs.Dir.create(
            objectid,
            attributes,
            new cyfs.NDNObjectInfo(info),
            body,
        )
        let DirId = Dir.desc().calculate_id();
        fs.writeFileSync(filepath1, Dir.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.DirDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap();
            let DirId_deco = target.desc().calculate_id();

            //获取Dir对象中file的id和chunkid
            let file_raw: any = target.body_expect().content().match<Uint8Array | undefined>({
                Chunk: () => { return undefined },
                ObjList: (list) => {
                    return list.get(fileid)?.buffer;
                }
            })!;
            let [file_target, unit]: [cyfs.File, Uint8Array] = new cyfs.FileDecoder().raw_decode(file_raw).unwrap()
            let [chunkinlist_deco]: any = file_target.body_expect().content().chunk_list.chunk_in_list
            let FileId_deco = file_target.desc().calculate_id()

            //属性校验
            assert(owner_deco?.equals(objectid), 'owner属性不相等');
            assert(DirId_deco?.equals(DirId), 'DirId属性不相等');
            assert(FileId_deco.equals(fileid), 'FileId属性不相等');
            assert.equal(chunkidstr, chunkinlist_deco.to_base_58());

        });
        it("Rust工具解码(Ts编码对象)：有效对Ts编码对象进行Rust工具解码", async function () {
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args = ' show -a ' + filepath1;
            let runInfo = await run(ffsClientPath, args, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验DirId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(DirId.to_base_58(), objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(objectidstr, owner_rust)
                    }
                    //校验chunks属性
                    if (value == 'chunks') {
                        let chunks_rust = arr1[index]
                        let chunk_rust = chunks_rust.slice(1, chunks_rust.length - 3)
                        assert.equal(chunkidstr, chunk_rust)
                    }
                    //校验path属性
                    if (value == 'path') {
                        let path_rust = arr1[index]
                        assert.equal(path1, path_rust)
                    }
                    //校验file属性
                    if (value == 'file') {
                        let file_rust = arr1[index]
                        assert.equal(fileid.to_base_58(), file_rust)
                    }
                }
            });
        });

        it.skip("Rust工具编码->Ts解码：有效进行Rust工具编码对象，再进行Ts解码流程", async function () {
            //rust创建对象
            //创建cmd命令：cyfs-client.exe create ./test_config/test_dir --chunk_size 8192 --owner ./test_config/test_owner
            let ffsClientPath = __dirname + '/test-tool/tool/cyfs-client.exe';
            let args1 = ' create ./test_config/test_dir --chunk_size 8192 --owner ./test_config/test_owner';
            var rust_desc = ''
            let runInfo1 = await run(ffsClientPath, args1, false, (data: string) => {
                rust_desc = data.slice(data.length - 45, data.length - 1)

            })

            //Ts解码(Ts编码对象)对象,获取属性
            let rustfilepath = __dirname + '/test-tool/tool/' + rust_desc + '.fileobj'
            let desc_buffer = decoder(rustfilepath)
            let [target, buffer] = new cyfs.DirDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_ts: any = target.desc().owner()?.unwrap().to_base_58();
            let DirId_ts: string = target.desc().calculate_id().to_base_58()
            //获取Dir对象中file的id和chunkid
            let file_raw: any = target.body_expect().content().match<Uint8Array | undefined>({
                Chunk: () => { return undefined },
                ObjList: (list) => {
                    return list.get(fileid)?.buffer;
                }
            })!;
            let [file_target, unit] = new cyfs.FileDecoder().raw_decode(file_raw).unwrap()
            let [chunkinlist_ts]: any = file_target.body_expect().content().chunk_list.chunk_in_list
            let fileId_ts: string = file_target.desc().calculate_id().to_base_58()

            //rust解码对象，校验属性值
            let ffsClientPath2 = __dirname + '/test-tool/tool/desc-tool.exe';
            let args2 = ' show -a ' + rustfilepath;
            let runInfo2 = await run(ffsClientPath2, args2, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验DirId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(DirId_ts, objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(owner_ts, owner_rust)
                    }
                    //校验chunks属性
                    if (value == 'chunks') {
                        let chunks_rust = arr1[index]
                        let chunk_rust = chunks_rust.slice(1, chunks_rust.length - 3)
                        assert.equal(chunkinlist_ts.to_base_58(), chunk_rust)
                    }
                    //校验path属性
                    if (value == 'path') {
                        let path_rust = arr1[index]
                        assert.equal(path1, path_rust)
                    }
                    //校验file属性
                    if (value.indexOf('	file') == 0) {
                        let file_rust = arr1[index]
                        assert.equal(fileId_ts, file_rust)

                        //验证所有属性测试通过，执行删除测试desc文件命令
                        DeleteDescFile(rustfilepath);
                    }
                }
            })
        });

    });

})