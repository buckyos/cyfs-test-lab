import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");


describe("测试NFTList对象编解码", function () {
    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let objectidstr1 = '5aUiNsqdLLkUg3o63eSBz6R3CdbrFqadfqV7quYzMAbL';

    //定义文件路径
    let filepath = descpath('NFTList');
    let filepath2 = descpath('NFTList2')

    let owner = cyfs.ObjectId.from_str(objectidstr).unwrap()
    let id = cyfs.ObjectId.from_str(objectidstr).unwrap()
    let comment = new cyfs.BuckyString(objectidstr1)

    describe("编码", function () {
        it("Ts编码：有效传入owner参数", async function () {
            let NFTList = cyfs.NFTList.create(
                owner
            )
            fs.writeFileSync(filepath, NFTList.to_vec().unwrap());
        });
    });

    describe("编码-操作方法调用", function () {
        //对象创建
        let NFTList = cyfs.NFTList.create(
            owner
        );

        it("Ts编码：有效obj_list()调用,查看obj_list的值", async function () {
            let applist = NFTList.obj_list();
            assert.equal(applist.size, 0)
            fs.writeFileSync(filepath, NFTList.to_vec().unwrap());
        });
        it("Ts编码：有效put()调用，修改obj_list的值", async function () {
            NFTList.put(id, comment);
            assert.equal(true, NFTList.obj_list().has(id))
            fs.writeFileSync(filepath, NFTList.to_vec().unwrap());
        });
        it("Ts编码：有效remove()调用，删除obj_list的值", async function () {
            NFTList.remove(id);
            assert.equal(NFTList.obj_list().size, 0)
            fs.writeFileSync(filepath, NFTList.to_vec().unwrap());
        });
        it("Ts编码：有效clear()调用，清空obj_list的值", async function () {
            NFTList.put(id, comment);
            NFTList.put(id, comment);
            NFTList.put(id, comment);
            NFTList.clear();
            assert.equal(NFTList.obj_list().size, 0)
            fs.writeFileSync(filepath, NFTList.to_vec().unwrap());
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let NFTList = cyfs.NFTList.create(
            owner
        )
        fs.writeFileSync(filepath2, NFTList.to_vec().unwrap());
        let NFTListId = NFTList.desc().calculate_id();

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.NFTListDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap();
            let NFTListId_deco = target.desc().calculate_id();

            //属性校验
            assert(owner_deco?.equals(owner), 'owner属性不相等');
            assert(NFTListId_deco.equals(NFTListId), 'NFTListId属性不相等');

        });
        it("Ts解码(Ts编码对象)：有效对修改过obj_list属性的对象进行Ts解码", async function () {
            //put()调用，并进行编码
            NFTList.put(id, comment);
            fs.writeFileSync(filepath2, NFTList.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.NFTListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            let NFTList_objlist = NFTList.obj_list()
            NFTList_objlist.forEach((value, key) => {
                if (key.equals(id)) {
                    assert(value.equals(comment), 'obj_list属性不相等')
                }
            })

        });
        it("Ts解码(Ts编码对象)：有效对调用remove()的对象进行Ts解码", async function () {
            //remove()调用，并进行编码
            NFTList.put(id, comment);
            NFTList.remove(id)
            fs.writeFileSync(filepath2, NFTList.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.NFTListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(target.obj_list().size, 0)
        });
        it("Ts解码(Ts编码对象)：有效对调用clear()的对象进行Ts解码", async function () {
            //clear()调用，并进行编码
            NFTList.put(id, comment);
            NFTList.put(id, comment);
            NFTList.put(id, comment);
            NFTList.clear()
            fs.writeFileSync(filepath2, NFTList.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.NFTListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(target.obj_list().size, 0)
        });
    });
})