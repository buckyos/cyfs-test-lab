import * as cyfs from '../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");



//PutApp对象测试
describe.skip("测试PutApp对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let decappidstr = '9tGpLNnX15t9qjxyAsABtdfEFUMLLHtA9iWtfVJN2BqR';
    let decappidstr2 = '9tGpLNnBFQCLADCM6BHWa953N84yZyjvNvvMb3pURVCk';
    let version = '1.0.111';
    let version2 = '1.0.222';

    let owner = cyfs.ObjectId.from_str(objectidstr).unwrap()
    let id = cyfs.DecAppId.from_base_58(decappidstr).unwrap()
    let id2 = cyfs.DecAppId.from_base_58(decappidstr2).unwrap()
    let AppStatus = cyfs.AppStatus.create(
        owner,
        id,
        version,
        true
    )
    let AppStatus2 = cyfs.AppStatus.create(
        owner,
        id2,
        version2,
        true
    )

    let AppStatusList = [AppStatus];
    let AppStatusLists = [AppStatus, AppStatus2];
    let AppStatusList_e: cyfs.AppStatus[] = []

    //定义文件路径
    let filepath = descpath('AppPut1');
    let filepath2 = descpath('AppPut2');

    describe("编码", function () {
        // it("Ts编码：有效传入owner,AppStatusList参数", async function () {
        //     let PutApp = cyfs.PutApp.create(
        //         owner,
        //         AppStatusList
        //     )
        //     fs.writeFileSync(filepath, PutApp.to_vec().unwrap());
        // });
        // it("Ts编码：有效传入多值的AppStatusList参数", async function () {
        //     let PutApp = cyfs.PutApp.create(
        //         owner,
        //         AppStatusLists
        //     )
        //     fs.writeFileSync(filepath, PutApp.to_vec().unwrap());
        // });
        // it("Ts编码：有效传入空值的AppStatusList参数", async function () {
        //     let PutApp = cyfs.PutApp.create(
        //         owner,
        //         AppStatusList_e
        //     )
        //     fs.writeFileSync(filepath, PutApp.to_vec().unwrap());
        // });
    });

    describe("解码", function () {
        //Ts编码生成对象
        // let PutApp = cyfs.PutApp.create(
        //     owner,
        //     AppStatusList
        // )
        // let PutAppId = PutApp.desc().calculate_id()
        // fs.writeFileSync(filepath2, PutApp.to_vec().unwrap());

        // it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
        //     //对象解码
        //     let desc_buffer = decoder(filepath2)
        //     let [target, buffer] = new cyfs.PutAppDecoder().raw_decode(desc_buffer).unwrap();

        //     //获取属性
        //     let owner_deco = target.desc().owner()?.unwrap()
        //     let PutAppId_deco = target.desc().calculate_id()

        //     //属性校验
        //     assert(owner_deco?.equals(owner), 'owner属性不相等');
        //     assert(PutAppId_deco.equals(PutAppId), 'PutAppId属性不相等');
        // });
    });
})