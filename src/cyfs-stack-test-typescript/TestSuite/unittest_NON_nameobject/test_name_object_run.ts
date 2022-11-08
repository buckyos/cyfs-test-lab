import {cyfs} from '../../cyfs_node'
import { Test, TestDecoder } from './name_object/name_object';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");


//Test对象测试
describe("测试自定义对象编解码", async function () {
    //外部定义Test自定义对象 所需传入参数
    //定义数值
    let owner_str = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC'
    let decapp_str = '9tGpLNnfbRQD28vw69SF8jri6Mhwq6Xqd6FfinCfbvBL'
    let id = 'Ua1Fgkj3oyPyVztLZ3bt7NEiPUGSX7hTTuZZXs4HGyz';
    let endpoint_str = 'L6udp[512:2067:4658:4686:1217:512:768:255]:20993'
    let b_string = '123213232323'
    let b_number = 4503599627370496

    //定义传入参
    let owner = cyfs.ObjectId.from_base_58(owner_str).unwrap();
    let decappid = cyfs.DecAppId.from_base_58(decapp_str).unwrap();
    let data = new Uint8Array([1, 23, 4, 5, 5, 6, 7, 8, 8, 9, 9, 9, 98, 98, 989, 898, 98, 9]);
    let testSize = 8789451321555;
    let salt = new Uint8Array(32);
    let endpoints = cyfs.Endpoint.fromString(endpoint_str).unwrap();
    let status = 1;

    //定义一个BuckyTuple
    let buckystring = new cyfs.BuckyString(b_string);
    let buckynuber = new cyfs.BuckyNumber('u128', b_number);
    let mix_data = new cyfs.BuckyTuple([endpoints, buckystring, buckynuber]);

    //定义传入参
    let source = new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.ObjectId>()
    source.set(buckystring, owner)
    let icon = cyfs.Some(buckystring)
    let list = new cyfs.BuckyHashSet<cyfs.DecAppId>()
    list.add(decappid)

    //定义编码文件地址
    let filepath = descpath('NameObject1')
    let filepath1 = descpath('NameObject2')

    describe("编码", function () {
        it("Ts编码：有效传入所有数据类型参数-编码", function () {
            let Test1 = Test.create(
                owner,
                id,
                data,
                testSize,
                salt,
                new cyfs.Vec([endpoints]),
                new cyfs.Vec([mix_data]),
                source,
                icon,
                list,
                status,
            )
            fs.writeFileSync(filepath, Test1.to_vec().unwrap());
        });
    });

    describe("解码", async function () {
        //Ts编码生成对象
        let Test1 = Test.create(
            owner,
            id,
            data,
            testSize,
            salt,
            new cyfs.Vec([endpoints]),
            new cyfs.Vec([mix_data]),
            source,
            icon,
            list,
            status,
        )
        let TestId = Test1.desc().calculate_id();
        fs.writeFileSync(filepath1, Test1.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new TestDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap();
            let TestId_deco = target.desc().calculate_id();
            let id_deco: string = target.name();
            let data_deco: Uint8Array = target.getData()
            let testSize_deco: number = target.body_expect().content().test_size
            let salt_deco = target.getSalt()
            let endpoints_deco = target.getendpoints()[0]
            let mix_data_deco = target.getMixData().value()
            let source_deco = target.source()
            let icon_deco = target.icon()
            let list_deco = target.test_list()
            let status_deco = target.status()

            //属性校验
            assert(owner_deco?.equals(owner), 'owner属性不相等');
            assert(TestId_deco.equals(TestId), 'TestId属性不相等');
            assert.equal(id, id_deco);

            //data属性校验
            for (let i in data_deco) {
                assert.equal(data[i], data_deco[i]);
            }
            assert.equal(testSize, testSize_deco);
            assert.equal(salt.toString(), salt_deco.toString());
            assert.equal(endpoint_str, endpoints_deco.toString());

            //mix_data属性校验
            assert.equal(endpoint_str, mix_data_deco[0].index<cyfs.Endpoint>(0).toString());
            assert.equal(b_string, mix_data_deco[0].index<cyfs.BuckyString>(1).toString());
            assert.equal(b_number, mix_data_deco[0].index<cyfs.BuckyNumber>(2).toNumber());

            //source属性校验
            source_deco.forEach((value, key) => {
                if (key.toString() == b_string) {
                    assert(value.equals(owner), 'owner属性不相等');
                } else {
                    assert.equal(b_string, key.toString());
                    assert(value.equals(owner), 'owner属性不相等');
                }
            });

            assert.equal(b_string, icon_deco);

            for (let i in list_deco) {
                assert(list_deco[i].equals(decappid), 'decappid属性不相等')
            }
            assert.equal(true, status_deco)
        });
    });
})