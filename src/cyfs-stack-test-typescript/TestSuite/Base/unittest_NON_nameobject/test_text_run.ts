import * as cyfs from '../../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");


//TextObject对象测试
describe("测试TextObject对象编解码", async function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let id = '我是id';
    let header = '我是header';
    let value = '我是value'
    let owner = cyfs.ObjectId.from_str(objectidstr).unwrap()

    //定义set()传入参数
    let id2 = '修改后的id';
    let header2 = '修改后的header';
    let value2 = '修改后的value'

    //定义空值
    let id_e = '';
    let header_e = '';
    let value_e = '';

    //定义文件路径
    let filepath = descpath('TextObject')
    let filepath1 = descpath('TextObject1')
    let filepath2 = descpath('TextObject2')
    let filepath3 = descpath('TextObject3')

    describe("编码", function () {
        it("Ts编码：有效传入owner,id,header,value参数", function () {
            let TextObject = cyfs.TextObject.create(
                owner,
                id,
                header,
                value
            )
            fs.writeFileSync(filepath, TextObject.to_vec().unwrap());
        });
        it("Ts编码：有效传入owner,id,header,value为空值", function () {
            let TextObject = cyfs.TextObject.create(
                owner,
                id_e,
                header_e,
                value_e
            )
            fs.writeFileSync(filepath2, TextObject.to_vec().unwrap());
        });
    });

    describe("编码-操作方法调用", function () {
        it("Ts编码：有效set_value()调用，修改value的值", function () {
            let TextObject = cyfs.TextObject.create(
                owner,
                id,
                header,
                value
            )
            TextObject.body_expect().content().set_value(value2)

            //属性校验
            assert.equal(value2, TextObject.body_expect().content().value);
            fs.writeFileSync(filepath, TextObject.to_vec().unwrap());
        });

        it("Ts编码：有效set_id()调用，修改id的值", function () {
            let TextObject = cyfs.TextObject.create(
                owner,
                id,
                header,
                value
            )
            TextObject.desc().content().set_id(id2)

            //属性校验
            assert.equal(id2, TextObject.desc().content().id);
            fs.writeFileSync(filepath, TextObject.to_vec().unwrap());
        });

        it("Ts编码：有效set_header()调用，修改header的值", function () {
            let TextObject = cyfs.TextObject.create(
                owner,
                id,
                header,
                value
            )
            TextObject.desc().content().set_header(header2)

            //属性校验
            assert.equal(header2, TextObject.desc().content().header);
            fs.writeFileSync(filepath, TextObject.to_vec().unwrap());
        });
        it("Ts编码：有效修改id,value,header为空值", function () {
            let TextObject = cyfs.TextObject.create(
                owner,
                id,
                header,
                value
            )
            TextObject.body_expect().content().set_value(value_e)
            TextObject.desc().content().set_id(id_e)
            TextObject.desc().content().set_header(header_e)

            //属性校验
            assert.equal(value_e, TextObject.body_expect().content().value);
            assert.equal(id_e, TextObject.desc().content().id);
            assert.equal(header_e, TextObject.desc().content().header);
            fs.writeFileSync(filepath3, TextObject.to_vec().unwrap());
        });
    });

    describe("解码", async function () {
        //Ts编码生成对象
        let TextObject = cyfs.TextObject.create(
            owner,
            id,
            header,
            value
        )
        let TextObjectId = TextObject.desc().calculate_id();
        fs.writeFileSync(filepath1, TextObject.to_vec().unwrap());
        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.TextObjectDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco: any = target.desc().owner();
            let TextObjectId_deco = target.desc().calculate_id();
            let id_deco: string = target.desc().content().id
            let header_deco: string = target.desc().content().header
            let value_deco: string = target.body_expect().content().value

            //属性校验
            assert(owner_deco.equals(owner), 'owner属性不相等');
            assert.equal(id, id_deco);
            assert.equal(header, header_deco);
            assert.equal(value, value_deco);
            assert(TextObjectId_deco.equals(TextObjectId), 'TextObject Id属性不相等');
        });
        it("Ts解码(Ts编码对象)：有效传入owner,id,header,value为空值进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.TextObjectDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let id_deco = target.desc().content().id
            let header_deco = target.desc().content().header
            let value_deco = target.body_expect().content().value

            //属性校验
            assert.equal(id_e, id_deco);
            assert.equal(header_e, header_deco);
            assert.equal(value_e, value_deco);
        });
        it("Ts解码(Ts编码对象)：有效对修改过id属性的对象进行Ts解码", function () {
            TextObject.desc().content().set_id(id2)
            fs.writeFileSync(filepath1, TextObject.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.TextObjectDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let id_deco: string = target.desc().content().id

            //属性校验
            assert.equal(id2, id_deco);
        });
        it("Ts解码(Ts编码对象)：有效对修改过header属性的对象进行Ts解码", function () {
            TextObject.desc().content().set_header(header2)
            fs.writeFileSync(filepath1, TextObject.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.TextObjectDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let header_deco: string = target.desc().content().header

            //属性校验
            assert.equal(header2, header_deco);
        });
        it("Ts解码(Ts编码对象)：有效对修改过value属性的对象进行Ts解码", function () {
            TextObject.body_expect().content().set_value(value2)
            fs.writeFileSync(filepath1, TextObject.to_vec().unwrap());

            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.TextObjectDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let value_deco: string = target.body_expect().content().value

            //属性校验
            assert.equal(value2, value_deco);
        });
        it("Ts解码(Ts编码对象)：有效修改owner,id,header,value为空值进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath3)
            let [target, buffer] = new cyfs.TextObjectDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let id_deco = target.desc().content().id
            let header_deco = target.desc().content().header
            let value_deco = target.body_expect().content().value

            //属性校验
            assert.equal(id_e, id_deco);
            assert.equal(header_e, header_deco);
            assert.equal(value_e, value_deco);
        });
    });
})
