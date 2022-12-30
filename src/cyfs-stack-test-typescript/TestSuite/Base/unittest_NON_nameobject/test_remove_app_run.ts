import * as cyfs from '../../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");

//RemoveApp对象测试  
describe.skip("测试RemoveApp对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let decappidstr1 = '9tGpLNnX15t9qjxyAsABtdfEFUMLLHtA9iWtfVJN2BqR';
    let decappidstr2 = '9tGpLNnBFQCLADCM6BHWa953N84yZyjvNvvMb3pURVCk';

    let owner = cyfs.ObjectId.from_str(objectidstr).unwrap();
    let decappid1 = cyfs.DecAppId.from_base_58(decappidstr1).unwrap();
    let decappid2 = cyfs.DecAppId.from_base_58(decappidstr2).unwrap();

    let DecAppIdList = [decappid1];
    let DecAppIdLists = [decappid1, decappid2];
    let DecAppIdList_e: cyfs.DecAppId[] = [];

    //定义文件路径
    let filepath = descpath('RemoveApp1');
    let filepath1 = descpath('RemoveApp2');


    describe("编码", function () {
        // it("Ts编码：有效传入owner,DecAppIdList参数", async function () {
        //     let RemoveApp = cyfs.RemoveApp.create(
        //         owner,
        //         DecAppIdList
        //     )
        //     fs.writeFileSync(filepath, RemoveApp.to_vec().unwrap());
        // });
        // it("Ts编码：有效传入多值的DecAppIdList参数", async function () {
        //     let RemoveApp = cyfs.RemoveApp.create(
        //         owner,
        //         DecAppIdLists
        //     )
        //     fs.writeFileSync(filepath, RemoveApp.to_vec().unwrap());
        // });
        // it("Ts编码：有效传入空值的DecAppIdList参数", async function () {
        //     let RemoveApp = cyfs.RemoveApp.create(
        //         owner,
        //         DecAppIdList_e
        //     )
        //     fs.writeFileSync(filepath, RemoveApp.to_vec().unwrap());
        // });
    });

    describe("解码", function () {
        //Ts编码生成对象
        // let RemoveApp = cyfs.RemoveApp.create(
        //     owner,
        //     DecAppIdList
        // )
        // let RemoveAppId = RemoveApp.desc().calculate_id();
        // fs.writeFileSync(filepath1, RemoveApp.to_vec().unwrap());

        // it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
        //     //对象解码
        //     let desc_buffer = decoder(filepath1)
        //     let [target, buffer] = new cyfs.RemoveAppDecoder().raw_decode(desc_buffer).unwrap();

        //     //获取属性
        //     let owner_deco = target.desc().owner()?.unwrap();
        //     let RemoveAppId_deco = target.desc().calculate_id();

        //     //属性校验
        //     assert(owner_deco?.equals(owner), 'owner属性不相等');
        //     assert(RemoveAppId_deco.equals(RemoveAppId), 'RemoveAppId属性不相等');

        // });

    });

})