import * as cyfs from '../../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");


//AppStatus对象测试
describe("测试AppStatus对象编解码", function () {
    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let decappidstr = '9tGpLNnX15t9qjxyAsABtdfEFUMLLHtA9iWtfVJN2BqR';
    let version = '1.0.111';
    let version_e = '';

    //定义文件路径
    let filepath = descpath('AppStatus1')
    let filepath1 = descpath('AppStatus2')


    let owner = cyfs.ObjectId.from_str(objectidstr).unwrap()
    let id = cyfs.DecAppId.from_base_58(decappidstr).unwrap()

    describe("编码", function () {
        it("Ts编码：有效传入owner,id,version,status参数", async function () {
            let AppStatus = cyfs.AppStatus.create(
                owner,
                id,
                version,
                true
            )
            fs.writeFileSync(filepath, AppStatus.to_vec().unwrap());
        });
        it("Ts编码：有效传入false值的status,version为空值的参数", async function () {
            let AppStatus = cyfs.AppStatus.create(
                owner,
                id,
                version_e,
                false
            )
            fs.writeFileSync(filepath1, AppStatus.to_vec().unwrap());
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let AppStatus = cyfs.AppStatus.create(
            owner,
            id,
            version,
            false
        )
        fs.writeFileSync(filepath1, AppStatus.to_vec().unwrap());
        let AppStatusId = AppStatus.desc().calculate_id();

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.AppStatusDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner();
            let id_deco = target.app_id()
            let version_deco: string = target.version();
            let status1: boolean = target.status()
            let AppStatusId_deco = target.desc().calculate_id()

            //属性校验
            assert(owner_deco?.equals(owner), 'owner属性不相等');
            assert(id_deco.equals(id), 'id属性不相等');
            assert.equal(version_e, version_deco);
            assert.equal(false, status1);
            assert(AppStatusId_deco.equals(AppStatusId), 'AppStatusId属性不相等');
        });
        it("Ts解码(Ts编码对象)：有效对status参数传true的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath)
            let [target, buffer] = new cyfs.AppStatusDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let status_deco: boolean = target.status()

            //属性校验
            assert.equal(true, status_deco);
        });
    });
})