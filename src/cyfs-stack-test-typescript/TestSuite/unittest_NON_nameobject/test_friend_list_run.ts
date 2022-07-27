import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");

//FriendList对象测试
describe("测试FriendList对象编解码", async function () {

    //定义创建对象传入参数
    let peopleidstr = '5r6LxrnJnskTUb6B5jzFMFjLiFmf1DDMmCBg1DEwnC1a';
    let peopleid = cyfs.PeopleId.from_base_58(peopleidstr).unwrap();
    let auto_msg = 'sdjksdjsdksjadji1321321321984sjdsd';
    let auto_msg_e = ''

    //定义文件路径
    let filepath = descpath('FriendList')
    let filepath1 = descpath('FriendList1')
    let filepath2 = descpath('FriendList2')
    let filepath3 = descpath('FriendList3')
    let filepath4 = descpath('FriendList4')

    describe("编码", function () {
        it("Ts编码：有效传入peopleid,auto_confirm参数", function () {
            let FriendList = cyfs.FriendList.create(
                peopleid,
                true
            )
            fs.writeFileSync(filepath, FriendList.to_vec().unwrap());
        });
        it("Ts编码：有效修改auto_confirm参数", function () {
            let FriendList = cyfs.FriendList.create(
                peopleid,
                true
            )
            FriendList.set_auto_confirm(false)
            assert.equal(false, FriendList.auto_confirm())
            fs.writeFileSync(filepath2, FriendList.to_vec().unwrap());
        });
        it("Ts编码：有效修改auto_msg参数", function () {
            let FriendList = cyfs.FriendList.create(
                peopleid,
                true
            )
            FriendList.set_auto_msg(auto_msg)
            assert.equal(auto_msg, FriendList.auto_msg())
            fs.writeFileSync(filepath3, FriendList.to_vec().unwrap());
        });
        it("Ts编码：有效修改auto_msg为空参数", function () {
            let FriendList = cyfs.FriendList.create(
                peopleid,
                true
            )
            FriendList.set_auto_msg(auto_msg_e)
            assert.equal(auto_msg_e, FriendList.auto_msg())
            fs.writeFileSync(filepath4, FriendList.to_vec().unwrap());
        });
    });


    describe("解码", async function () {
        //Ts编码生成对象
        let FriendList = cyfs.FriendList.create(
            peopleid,
            false
        )
        let FriendListId = FriendList.desc().calculate_id()
        fs.writeFileSync(filepath1, FriendList.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.FriendListDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap()
            let FriendListId_deco = target.desc().calculate_id()

            //属性校验
            assert(owner_deco?.equals(peopleid.object_id), 'owner属性不相等');
            assert(FriendListId_deco.equals(FriendListId), 'FriendListId属性不相等');
        });

        it("Ts解码(Ts编码对象)：有效friend_list()调用,查看friend_list的值", function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.FriendListDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let friend_list: any = target.friend_list()
        });
        it("Ts解码(Ts编码对象)：有效对修改过auto_confirm属性的对象进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.FriendListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(false, target.auto_confirm())
        });
        it("Ts解码(Ts编码对象)：有效对修改过auto_msg属性的对象进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath3)
            let [target, buffer] = new cyfs.FriendListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(auto_msg, target.auto_msg())
            assert.equal(true, target.auto_confirm())
        });
        it("Ts解码(Ts编码对象)：有效对修改过auto_msg属性为空的对象进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath4)
            let [target, buffer] = new cyfs.FriendListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(auto_msg_e, target.auto_msg())
        });
    });

})
