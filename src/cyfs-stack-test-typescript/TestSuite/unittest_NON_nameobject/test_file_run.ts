import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, run, decoder, DeleteDescFile } from './index';
import JSBI from 'jsbi';
var assert = require("assert");


//File对象测试
describe("测试File对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let fileidstr = '7Tk94YfN97gw6CVGFLqxuEZWwYJrYcF6C7idYBU7MkiQ';
    let chunkidstr = 'Ua1Fgkj3oyPyVztLZ3bt7NEiPUGSX7hTTuZZXs4HGyz'
    let lenstr = '18446744073709551615'
    let filepath = descpath('File1');
    let filepath1 = descpath('File2');
    let filepath2 = descpath('File3')  //只传入fileid参数
    let filepath3 = descpath('File4')  //传入fileid、chunkid参数

    //创建File对象所需要的参数
    let objectid = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
    let len = JSBI.BigInt(lenstr)

    function file_hash(): cyfs.HashValue {
        let desc_buffer = decoder(__dirname + '/test-tool/tool/test_config/test_file.desc')
        let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();
        let desc = target.desc().content().hash
        return desc
    }
    let filehash = file_hash()
    let fileid = cyfs.FileId.from_base_58(fileidstr).unwrap()
    let chunkid = cyfs.ChunkId.from_base_58(chunkidstr).unwrap()
    let chunk_list1 = new cyfs.ChunkList(
        [chunkid],
        undefined,
    )
    let chunk_list2 = new cyfs.ChunkList(
        undefined,
        fileid,
    )
    let chunk_list3 = new cyfs.ChunkList(
        [chunkid],
        fileid,
    )


    describe("编码", function () {
        it("Ts编码：有效传入owner,len,filehash,chunk_list1{[chunkid],undefined}参数-编码", async function () {
            let File = cyfs.File.create(
                objectid,
                len,
                filehash,
                chunk_list1
            )
            fs.writeFileSync(filepath, File.to_vec().unwrap());
        });
        it("Ts编码：有效传入{undedefind,fileid}组成的chunk_list参数", async function () {
            let File = cyfs.File.create(
                objectid,
                len,
                filehash,
                chunk_list2
            )
            fs.writeFileSync(filepath2, File.to_vec().unwrap());
        });
        it("Ts编码：有效传入{[chunkid],fileid}组成的chunk_list参数", async function () {
            let File = cyfs.File.create(
                objectid,
                len,
                filehash,
                chunk_list3
            )
            fs.writeFileSync(filepath3, File.to_vec().unwrap());
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let File = cyfs.File.create(
            objectid,
            len,
            filehash,
            chunk_list1
        )
        let FileId = File.desc().calculate_id()
        fs.writeFileSync(filepath1, File.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap();
            let FileId_deco = target.desc().calculate_id()
            let len_deco = target.desc().content().len
            let [chunkinlist_deco]: any = target.body_expect().content().chunk_list.chunk_in_list
            let fileid_deco = target.body_expect().content().chunk_list.file_id

            //属性校验
            assert(owner_deco?.equals(objectid), 'owner属性不相等');
            assert(FileId_deco.equals(FileId), 'FileId属性不相等');
            assert.equal(lenstr, len_deco.toString());
            assert.equal(undefined, fileid_deco);
            assert.equal(chunkidstr, chunkinlist_deco?.to_base_58());

        });

        it("Ts解码(Ts编码对象)：有效对chunk_list参数传{undedefind,fileid}的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let fileid_deco = target.body_expect().content().chunk_list.file_id

            //属性校验
            assert(fileid_deco?.equals(fileid), 'chunk_list属性不相等');

        });

        it("Ts解码(Ts编码对象)：有效对chunk_list参数传{[chunkid],fileid}的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let chunkinlist_deco: any = target.body_expect().content().chunk_list.chunk_in_list
            let fileid_deco = target.body_expect().content().chunk_list
            //属性校验
            assert(fileid_deco.file_id?.equals(fileid),'chunk_list属性不相等')
            assert.equal(undefined, chunkinlist_deco);

        });

        it("Rust工具解码(Ts编码对象)：有效对Ts编码对象进行Rust工具解码", async function () {
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args = ' show -a ' + filepath1;
            let runInfo = await run(ffsClientPath, args, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验FileId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(FileId.to_base_58(), objectid_rust)
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
                }
            });
        });

        it("Rust工具解码(Ts编码对象)：有效对chunk_list参数传{undedefind,fileid}的对象进行Rust工具解码", async function () {
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args = ' show -a ' + filepath2;
            let runInfo = await run(ffsClientPath, args, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验chunks属性
                    if (value == 'chunks') {
                        let chunks_file_rust = arr1[index]
                        let chunk_fileid_rust = chunks_file_rust.slice(5)
                        assert.equal(fileidstr, chunk_fileid_rust)
                    }
                }
            });

        });

        it("Rust工具编码->Ts解码：有效进行Rust工具编码对象，再进行Ts解码流程", async function () {
            //rust创建对象
            //创建cmd命令：cyfs-client.exe create ./test_config/test_file.txt --chunk_size 8192 --owner ./test_config/test_owner
            let ffsClientPath = __dirname + '/test-tool/tool/cyfs-client.exe';
            let args1 = ' create ./test_config/test_file.txt --chunk_size 8192 --owner ./test_config/test_owner ';
            var rust_desc = ''
            let runInfo1 = await run(ffsClientPath, args1, false, (data: string) => {
                rust_desc = data.slice(data.length - 45, data.length - 1)
            })

            //Ts解码(Ts编码对象)对象,获取属性
            let rustfilepath = __dirname + '/test-tool/tool/' + rust_desc + '.fileobj'
            let desc_buffer = decoder(rustfilepath)
            let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_ts: any = target.desc().owner()?.unwrap().to_base_58();
            let FileId_ts: string = target.desc().calculate_id().to_base_58()
            let len_ts = target.desc().content().len
            let [chunkinlist_ts]: any = target.body_expect().content().chunk_list.chunk_in_list
            let fileid_ts = target.body_expect().content().chunk_list.file_id?.to_base_58()

            //rust解码对象，校验属性值
            let ffsClientPath2 = __dirname + '/test-tool/tool/desc-tool.exe';
            let args2 = ' show -a ' + rustfilepath;
            let runInfo2 = await run(ffsClientPath2, args2, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验FileId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(FileId_ts, objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(owner_ts, owner_rust)
                    }
                    //校验chunks属性
                    if (value == 'chunks') {
                        let ood_list_rust = arr1[index]
                        let ood_rust = ood_list_rust.slice(1, ood_list_rust.length - 3)
                        assert.equal(chunkinlist_ts.to_base_58(), ood_rust)

                        //验证所有属性测试通过，执行删除测试desc文件命令
                        DeleteDescFile(rustfilepath);
                    }
                }
            })
        });

    });

})