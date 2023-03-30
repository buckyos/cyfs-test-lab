import * as cyfs from '../../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';

var assert = require("assert");


//APP_EXT_INFO对象测试
describe("测试AppExtInfo对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let id = '你好1232cjxkcjzlcjklsckldsd@!#$%^&*(/*/*/**************';
    let info = '!@#$%^&WERTYUISXDCFVGBHNJM1234567'
    let id_e = '';
    let info_e = '';

    let owner = cyfs.ObjectId.from_str(objectidstr).unwrap()

    //定义文件路径
    let filepath = descpath('AppExtInfo')
    let filepath2 = descpath('AppExtInfo2')
    let filepath3 = descpath('AppExtInfo3')

    describe("编码", function () {
        it("Ts编码：有效传入owner，id参数", async function () {
            let AppExtInfo = cyfs.AppExtInfo.create(
                owner,
                id
            )
            fs.writeFileSync(filepath, AppExtInfo.to_vec().unwrap());
        });
        it("Ts编码：有效传入id空值参数", async function () {
            let AppExtInfo = cyfs.AppExtInfo.create(
                owner,
                id_e
            )
            fs.writeFileSync(filepath2, AppExtInfo.to_vec().unwrap());
        });
    });
    describe("编码-操作方法调用", function () {
        it("Ts编码：set_info()调用", async function () {
            let AppExtInfo = cyfs.AppExtInfo.create(
                owner,
                id
            )
            AppExtInfo.set_info(info)
            assert.equal(info, AppExtInfo.info());
            fs.writeFileSync(filepath, AppExtInfo.to_vec().unwrap());
        });
        it("Ts编码：set_info(),传入空值调用", async function () {
            let AppExtInfo = cyfs.AppExtInfo.create(
                owner,
                id
            )
            AppExtInfo.set_info(info_e)
            assert.equal(info_e, AppExtInfo.info());
            fs.writeFileSync(filepath3, AppExtInfo.to_vec().unwrap());
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let AppExtInfo = cyfs.AppExtInfo.create(
            owner,
            id
        )
        fs.writeFileSync(filepath, AppExtInfo.to_vec().unwrap());
        let appexyinfoid = AppExtInfo.desc().calculate_id()

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath)
            let [target, buffer] = new cyfs.AppExtInfoDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner();
            let id_deco: any = target.desc().content().id
            let appexyinfoid_deco = target.desc().calculate_id()

            //属性校验
            assert(owner_deco?.equals(owner), 'ownerid不相等');
            assert(appexyinfoid_deco?.equals(appexyinfoid), 'appexyinfoid不相等');
            assert.equal(id, id_deco);
        });
        it("Ts解码(Ts编码对象)：有效对传入空值id进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.AppExtInfoDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let id_deco = target.desc().content().id

            //属性校验
            assert.equal(id_e, id_deco);
        });
        it("Ts解码(Ts编码对象)：有效对修改过info属性的对象进行Ts解码", async function () {
            //对象编码
            let AppExtInfo = cyfs.AppExtInfo.create(
                owner,
                id
            )
            AppExtInfo.set_info(info)
            assert.equal(info, AppExtInfo.info());
            fs.writeFileSync(filepath, AppExtInfo.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath)
            let [target, buffer] = new cyfs.AppExtInfoDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(info, target.info());
        });
        it("Ts解码(Ts编码对象)：有效对修改过info属性的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath3)
            let [target, buffer] = new cyfs.AppExtInfoDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(info_e, target.info());
        });
    });
})
