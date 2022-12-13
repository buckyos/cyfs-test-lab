import * as cyfs from '../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder } from './index';
var assert = require("assert");


var arr = new Uint8Array([21, 31, 1, 12, 323, 32, 43, 3, 43, 43, 43]);

//Storage对象测试
describe("测试Storage对象编解码", async function () {

    //定义创建对象传入参数
    let idstr = '1233232324ssss';
    let idstr_e = '';

    //定义文件路径
    let filepath = descpath('Storage')
    let filepath1 = descpath('Storage1')
    let filepath2 = descpath('Storage2')

    describe("编码", function () {
        it("Ts编码：有效传入id,value参数", function () {
            let Storage = cyfs.Storage.create(
                idstr,
                arr
            )
            fs.writeFileSync(filepath, Storage.to_vec().unwrap());
        });
        it("Ts编码：有效传入id为空值参数", function () {
            let Storage = cyfs.Storage.create(
                idstr_e,
                arr
            )
            fs.writeFileSync(filepath2, Storage.to_vec().unwrap());
        });
    });

    describe("解码", async function () {
        //Ts编码生成对象
        let Storage = cyfs.Storage.create(
            idstr,
            arr
        )
        let StorageId = Storage.storage_id();
        fs.writeFileSync(filepath1, Storage.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.StorageDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let id_deco: any = target.id();
            let value_deco: Uint8Array = target.value();
            let StorageId_deco = target.storage_id();

            //属性校验
            assert.equal(idstr, id_deco);
            for (let i in value_deco) {
                assert.equal(arr[i], value_deco[i]);
            }
            assert(StorageId_deco.equals(StorageId), 'StorageId属性不相等');
        });
        it("Ts解码(Ts编码对象)：有效对id传入空值进行Ts解码", function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.StorageDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let id_deco = target.id();

            //属性校验
            assert.equal(idstr_e, id_deco);
        });
    });
});