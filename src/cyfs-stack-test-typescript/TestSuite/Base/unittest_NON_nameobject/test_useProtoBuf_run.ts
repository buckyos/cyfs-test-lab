import * as cyfs from '../../../cyfs_node';
import { UseProtoBuf, UseProtoBufDecoder,UseProtoBufId } from '../../../common/types/useProtoBuf'
var assert = require("assert");

//UseProtoBuf扩展对象测试
describe("测试UseProtoBuf对象编解码", async function () {

    //定义创建对象传入参数
    let devicestr1 = '5aUiNsqr6NL7wJxXczpU8C7wecQ7NXnPtGCrFeM12789';
    let devicestr2 = '5aUiNsqNmYBFTeVaZcsUijQKYe3faYeTPL6STYE3i456';
    let objectstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';

    let owner = cyfs.ObjectId.from_base_58(objectstr).unwrap()
    let device1 = cyfs.DeviceId.from_base_58(devicestr1).unwrap();
    let device2 = cyfs.DeviceId.from_base_58(devicestr2).unwrap();

    let ood_list = [device1];
    let ood_lists = [device1, device1, device1, device1, device2];
    let ood_list_e: cyfs.DeviceId[] = [];
    let ood_alone_mode = cyfs.OODWorkMode.Standalone

    let active_upb: Uint8Array
    let active_upb1: Uint8Array
    let active_upb2: Uint8Array
    let UseProtoBuf_id: UseProtoBufId;
    let ood_active_mode = cyfs.OODWorkMode.ActiveStandby

    let known_device_list = [device2];
    let known_device_lists = [device2, device2, device2, device2, device1];
    let known_device_list_e: cyfs.DeviceId[] = [];

    let up1: Uint8Array
    let up2: Uint8Array
    let up3: Uint8Array


    describe("编码", function () {
        it("Ts编码：有效传入owner,ood_list,known_device_list参数", function () {
            let UseProto = UseProtoBuf.create(
                owner,
                ood_alone_mode,
                ood_list,
                known_device_list
            )
            up1 = UseProto.to_vec().unwrap();
            UseProtoBuf_id = UseProto.UseProtoBuf_id()
        });
        it("Ts编码：有效传入多值的ood_list,known_device_list参数", function () {
            let UseProto = UseProtoBuf.create(
                owner,
                ood_alone_mode,
                ood_lists,
                known_device_lists
            )
            up2 = UseProto.to_vec().unwrap();
        });
        it("Ts编码：有效传入空值的ood_list,known_device_list参数", function () {
            let UseProto = UseProtoBuf.create(
                owner,
                ood_alone_mode,
                ood_list_e,
                known_device_list_e
            )
            up3 = UseProto.to_vec().unwrap();
        });
    });

    describe("解码", async function () {
        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", function () {
            //对象解码
            let [target,u] = new UseProtoBufDecoder().raw_decode(up1).unwrap()

            //获取属性
            let owner_deco = target.owner();
            let Id_deco = target.UseProtoBuf_id();
            let ood_list_deco = target.ood_list();
            let known_device_list_deco = target.known_device_list()

            //属性校验
            assert(owner_deco.equals(owner), 'owner属性不相等');
            assert(Id_deco.equals(UseProtoBuf_id), 'Id属性不相等');
            for (let index in ood_list_deco) {
                assert(
                    ood_list_deco[index].equals(ood_list[index]),
                    'ood_list-device id属性不相等'
                )
            }
            for (let index in known_device_list_deco) {
                assert(
                    known_device_list_deco[index].equals(known_device_list[index]),
                    'known_device_list_deco-device id属性不相等'
                )
            }
        });
        it("Ts解码(Ts编码对象)：有效对ood_list,known_device_list参数传多值的对象进行Ts解码", function () {
            //对象解码
            let [target,u] = new UseProtoBufDecoder().raw_decode(up2).unwrap()

            //获取属性
            let ood_list_deco = target.ood_list();
            let known_device_list_deco = target.known_device_list()

            //属性校验
            for (let index in ood_list_deco) {
                assert(
                    ood_list_deco[index].equals(ood_lists[index]),
                    'ood_list-device id属性不相等'
                )
            }
            for (let index in known_device_list_deco) {
                assert(
                    known_device_list_deco[index].equals(known_device_lists[index]),
                    'known_device_list_deco-device id属性不相等'
                )
            }
        });
        it("Ts解码(Ts编码对象)：有效对ood_list,known_device_list参数传空值的对象进行Ts解码", function () {
            //对象解码
            let [target,u] = new UseProtoBufDecoder().raw_decode(up3).unwrap()


            //获取属性
            let ood_list_deco = target.ood_list();
            let known_device_list_deco = target.known_device_list();

            //属性校验
            assert.equal(0, ood_list_deco.length);
            assert.equal(0, known_device_list_deco.length);
        });
    });
})
