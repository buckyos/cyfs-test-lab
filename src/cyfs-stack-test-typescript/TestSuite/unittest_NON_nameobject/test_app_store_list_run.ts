import {cyfs} from '../../cyfs_node'
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");




//AppStoreList对象测试
describe("测试AppStoreList对象编解码", function () {
    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let decappidstr = '9tGpLNnX15t9qjxyAsABtdfEFUMLLHtA9iWtfVJN2BqR';

    let owner = cyfs.ObjectId.from_str(objectidstr).unwrap()
    let decappid = cyfs.DecAppId.from_base_58(decappidstr).unwrap()

    //定义文件路径
    let filepath = descpath('AppStoreList');
    let filepath2 = descpath('AppStoreList2');

    describe("编码", function () {
        it("Ts编码：有效传入owner参数", async function () {
            let AppStoreList = cyfs.AppStoreList.create(
                owner
            )
            fs.writeFileSync(filepath, AppStoreList.to_vec().unwrap());
        });
    });

    describe("编码-操作方法调用", function () {
        //对象创建
        let AppStoreList = cyfs.AppStoreList.create(
            owner
        );

        it("Ts编码：有效app_list()调用,查看app_list的值", async function () {
            let applist = AppStoreList.app_list();
            assert.equal(applist.length, 0)
            fs.writeFileSync(filepath, AppStoreList.to_vec().unwrap());
        });
        it("Ts编码：有效put()调用，修改app_list的值", async function () {
            AppStoreList.put(decappid);
            assert(AppStoreList.app_list()[0].equals(decappid), 'decappid属性不相等')
            fs.writeFileSync(filepath, AppStoreList.to_vec().unwrap());
        });
        it("Ts编码：有效remove()调用，删除app_list的值", async function () {
            AppStoreList.remove(decappid);
            assert.equal(AppStoreList.app_list().length, 0)
            fs.writeFileSync(filepath, AppStoreList.to_vec().unwrap());
        });
        it("Ts编码：有效clear()调用，清空app_list的值", async function () {
            AppStoreList.put(decappid);
            AppStoreList.put(decappid);
            AppStoreList.put(decappid);
            AppStoreList.clear();
            assert.equal(AppStoreList.app_list().length, 0)
            fs.writeFileSync(filepath, AppStoreList.to_vec().unwrap());
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let AppStoreList = cyfs.AppStoreList.create(
            owner
        )
        fs.writeFileSync(filepath2, AppStoreList.to_vec().unwrap());
        let AppStoreListId = AppStoreList.desc().calculate_id();

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.AppStoreListDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap();
            let AppStoreListId_deco = target.desc().calculate_id();

            //属性校验
            assert(owner_deco?.equals(owner), 'owner属性不相等');
            assert(AppStoreListId_deco.equals(AppStoreListId), 'AppStoreListId属性不相等');

        });
        it("Ts解码(Ts编码对象)：有效对修改过app_list属性的对象进行Ts解码", async function () {
            //put()调用，并进行编码
            AppStoreList.put(decappid);
            fs.writeFileSync(filepath2, AppStoreList.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.AppStoreListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert(AppStoreList.app_list()[0].equals(decappid), 'decappid属性不相等')
        });
        it("Ts解码(Ts编码对象)：有效对调用remove()的对象进行Ts解码", async function () {
            //remove()调用，并进行编码
            AppStoreList.put(decappid);
            AppStoreList.remove(decappid)
            fs.writeFileSync(filepath2, AppStoreList.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.AppStoreListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(target.app_list().length, 0)
        });

        it("Ts解码(Ts编码对象)：有效对调用clear()的对象进行Ts解码", async function () {
            //clear()调用，并进行编码
            AppStoreList.put(decappid);
            AppStoreList.put(decappid);
            AppStoreList.put(decappid);
            AppStoreList.clear()
            fs.writeFileSync(filepath2, AppStoreList.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.AppStoreListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(target.app_list().length, 0)
        });
    });
})