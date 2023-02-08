import * as cyfs from "../../../../cyfs_node"
import * as path from 'path'


import * as fs from 'fs-extra'
import { FileId } from "../../../../cyfs_node";

let proc_in: boolean | undefined = undefined;
let ret = 0;

function print_usage() {
    console.log("usage: ts-node test_kernel.ts [--in|--out] <json file path>")
}

function process_argv(): string | undefined {
    if (process.argv.length < 4) {
        print_usage()
    }

    if (process.argv[2] === "--in") {
        proc_in = true;    // 解码
        return process.argv[3]
    } else if (process.argv[2] === "--out") {
        proc_in = false;  // 编码
        return process.argv[3]
    } else {
        print_usage()
    }
}

function public_key(param: string): cyfs.PublicKey {
    let params = param.split(":");
    if (params.length != 2) {
        throw new Error(`invalid public key string ${param}`)
    }
    switch (params[0]) {
        case "random":
            let bits = parseInt(params[1])
            let pk = cyfs.PrivateKey.generate_rsa(bits).unwrap()
            return pk.public()
        // case "secp":
        //     return cyfs.PrivateKey.generate_secp256k1().unwrap().public()
        case "hex":
            return new cyfs.PublicKeyDecoder().raw_decode(Uint8Array.prototype.fromHex(params[1]).unwrap()).unwrap()[0]
        case "file":
            return new cyfs.PublicKeyDecoder().raw_decode(new Uint8Array(fs.readFileSync(params[1]))).unwrap()[0]
        default:
            throw new Error(`invalid public key protocol ${params[0]}`)
    }
}
function private_key(param: string): cyfs.PrivateKey {
    let params = param.split(":");
    if (params.length != 2) {
        throw new Error(`invalid private key string ${param}`)
    }
    let bits = parseInt(params[1])
    let pk = cyfs.PrivateKey.generate_rsa(bits).unwrap()
    return pk
}
function public_key_list(params: string[]): cyfs.PublicKey[] {
    let pklist: cyfs.PublicKey[] = []
    for (let j of params) {
        pklist.push(public_key(j))
    }
    return pklist
}


function get_len_buf(len: number) {
    let basestr = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789/测试汉字厸厶厽孓宀巛巜彳廴彡彐彳忄扌攵 氵灬 爫犭疒癶礻糹有一个菇凉他有些任性还有些嚣张/##$&@æ。？！.《》……&（)+-=/*"
    const arr: number[] = []
    let maxnum = basestr.length
    for (let i = 0; i < len; i++) {
        arr.push(basestr.charCodeAt(Math.floor(Math.random() * (maxnum - 0)) + 0))
    }
    let buf = new Uint8Array(arr)
    console.log(buf.byteLength)
    // console.log(buf)
    return buf
}

function exercise(num: number) {
    let newnum = cyfs.JSBI.BigInt(num)
    console.log("test design------------->  " + newnum)
}
function get_big_str(obj: any, key: string) {
    //避免直接使用临时变量，小心堆栈内存溢出
    let s = obj[key!].split(":")
    console.log("--------------------" + typeof s[0])
    let size = Number(s[0])
    if (s.length != 2 || typeof size !== "number" || size > 128 || s < 1) {  //1~128Mb
        throw new Error(`invalid unit string ${s}`)
    }
    size = size * 1024 * 1024
    let tmppath = path.join(cyfs.get_temp_path(), "strfile.txt");
    fs.removeSync(tmppath)
    let insertstr = ""
    let basestr = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789/测试汉字厸厶厽孓宀巛巜彳廴彡彐彳忄扌攵 氵灬 爫犭疒癶礻糹有一个菇凉他有些任性还有些嚣张/##$&@æ。？！.《》……&（)+-=/*"
    let maxnum = basestr.length
    for (let i = 0; i < 3000; i++) {
        insertstr += basestr.charAt(Math.floor(Math.random() * (maxnum - 0)) + 0);
    }
    let len = Buffer.byteLength(insertstr, 'utf-8');
    while (size > len) {
        fs.appendFileSync(tmppath, insertstr, "utf-8")
        size = size - len;
    }
    let strdata = fs.readFileSync(tmppath).toString()
    return strdata
}

function compare_arrays_len(array1: any[], array2: any[]) {
    if (array1.length !== array2.length) {
        console.error(`两个数组长度不一致 array1: ${array1.length} array2: ${array2.length}`)
    }
}
function save_path(nameobject: string, filename: string): string {
    let basepath = path.join(path.join(cyfs.get_temp_path(), "test_nameObject_ts"), nameobject)
    fs.ensureDirSync(basepath);
    let filepath = path.join(basepath, filename)
    return filepath;
}

//读取desc文件desc_buffer
export function decoder(filepath: string): Uint8Array {
    let desc_buf = fs.readFileSync(filepath);
    let desc_buffer = new Uint8Array(desc_buf);
    return desc_buffer
};

function process_common<DC extends cyfs.DescContent, BC extends cyfs.BodyContent, T extends cyfs.NamedObject<DC, BC>>
    (builder: cyfs.NamedObjectBuilder<DC, BC>, obj: any,
        constructor: new (desc: cyfs.NamedObjectDesc<DC>, body: cyfs.ObjectMutBody<DC, BC> | undefined, signs: cyfs.ObjectSigns, nonce?: cyfs.JSBI) => T): T {
    if (obj.owner) {
        builder = builder.owner(cyfs.ObjectId.from_base_58(obj.owner).unwrap())
    }

    if (obj.area) {
        if (obj.category) {
            let arealist: number[] = [];
            const values = obj.area.split(":");
            for (let v of values) { const vv = parseInt(v, 10); arealist.push(vv) }
            builder = builder.area(new cyfs.Area(arealist[0], arealist[1], arealist[2], obj.category))
        } else {
            builder = builder.area(cyfs.Area.from_str(obj.area).unwrap())
        }
    }

    if (obj.create_time) {
        builder = builder.create_time(cyfs.JSBI.BigInt(obj.create_time))
    }

    if (obj.update_time) {
        builder = builder.update_time(cyfs.JSBI.BigInt(obj.update_time))
    }

    if (obj.public_key) {
        builder = builder.single_key(public_key(obj.public_key))
    }

    if (obj.threshold && obj.owners) {
        builder = builder.mn_key(new cyfs.MNPublicKey(obj.threshold, new cyfs.Vec(public_key_list(obj.owners))))
    }


    return builder.build(constructor)
}

function output_check_err(type: string, except: string, actual: string) {
    console.error(`check ${type} failed!,\n --> except ${except},\n --> actual ${actual}`)
}


function check_common<DC extends cyfs.DescContent, BC extends cyfs.BodyContent>(actual: cyfs.NamedObject<DC, BC>, except: any): boolean {
    if (except.owner) {
        if (!actual.desc().owner()) {
            output_check_err("owner", except.owner, "undefined")
            return false;
        }

        if (!actual.desc().owner()) {
            output_check_err("owner", except.owner, "none")
            return false;
        }

        if (actual.desc().owner()!.to_base_58() !== except.owner) {
            output_check_err("owner", except.owner, actual.desc().owner()!.to_base_58())
            return false;
        }
    }

    if (except.area) {
        if (!actual.desc().area()) {
            output_check_err("area", except.area, "undefined")
            return false;
        }

        if (!actual.desc().area()) {
            output_check_err("area", except.area, "none")
            return false;
        }

        if (actual.desc().area()!.toString() !== except.area) {
            output_check_err("area", except.area, actual.desc().area()!.toString())
            return false;
        }
    }

    if (except.create_time) {
        if (actual.desc().create_time().toString() !== except.create_time) {
            output_check_err("create_time", except.create_time, actual.desc().create_time().toString())
            return false;
        }
    }

    if (except.update_time) {
        if (actual.body_expect().update_time().toString() !== except.update_time) {
            output_check_err("update_time", except.update_time, actual.body_expect().update_time().toString())
            return false;
        }
    }

    if (except.public_key) {
        let e_key = public_key(except.public_key).toHex().unwrap()
        if (!actual.desc().public_key()) {
            output_check_err("public_key", except.public_key, "undefined")
            return false;
        }
        let a_key = actual.desc().public_key()!.toHex().unwrap()
        if (e_key !== a_key && except.public_key.split(":")[0] !== "random") {
            output_check_err("public_key", e_key, a_key)
            return false;
        }
    }


    return true;
}

function process_people(obj: any) {
    let filepath = save_path("zone", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let people_r = new cyfs.PeopleDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (people_r.err) {
            console.error(`decode zone from file ${obj.file} err ${people_r.val}`)
            ret = people_r.val.code
            return;
        }
        // 先检查通用数据部分
        let people = people_r.unwrap()
        if (check_common(people, obj)) {
            // 再检测content数据
            if (obj.ood_list) {
                let deoodlist = people.body_expect().content().ood_list
                // TODO: 自己填写检测逻辑
                for (let i in deoodlist) {
                    if (deoodlist[i].to_base_58() !== obj.ood_list[i]) { output_check_err("ood_list", obj.ood_list, "oodlist属性解码后不一致") }
                }
            }
            if (obj.icon) {
                if (!people.body_expect().content().icon) {
                    output_check_err("icon", obj.icon, "undefined")
                    return;
                }

                if (people.body_expect().content().icon!.to_base_58() !== obj.icon) {
                    output_check_err("icon", obj.icon, people.body_expect().content().icon!.to_base_58())
                    return;
                }
            }
            if (obj.name) {
                if (!people.body_expect().content().name) {
                    output_check_err("name", obj.name, "undefined")
                    return;
                }
                if (obj.name.split(":")[1] === "mb") {
                    if (people.body_expect().content().name !== fs.readFileSync(path.join(cyfs.get_temp_path(), "strfile.txt")).toString()) {
                        console.error(`大字符串解码后不一致: ${obj.name}`); return;
                    }

                }
                else if (people.body_expect().content().name !== obj.name) {
                    output_check_err("name", obj.name, people.body_expect().content().name!)
                    return;
                }
            }
            if (obj.ood_work_mode) {
                if (people.body_expect().content().ood_work_mode() !== obj.ood_work_mode) {
                    output_check_err("ood_work_mode", obj.ood_work_mode, people.body_expect().content().ood_work_mode())
                    return;
                }
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let ood_list: cyfs.DeviceId[] = [];
        if (obj.ood_list) {
            for (const ood of obj.ood_list) {
                ood_list.push(cyfs.DeviceId.from_base_58(ood).unwrap())
            }
        }
        let icon;
        if (obj.icon) {
            icon = cyfs.FileId.from_base_58(obj.icon).unwrap()
        }
        let ood_work_mode
        if (obj.ood_work_mode === cyfs.OODWorkMode.Standalone || obj.ood_work_mode === cyfs.OODWorkMode.ActiveStandby) {
            ood_work_mode = obj.ood_work_mode as cyfs.OODWorkMode;
        }
        let name
        if (obj.name.split(":")[1] === "mb") { name = get_big_str(obj, "name") } else { name = obj.name }
        let builder = new cyfs.PeopleBuilder(new cyfs.PeopleDescContent(), new cyfs.PeopleBodyContent(ood_list, name, icon, ood_work_mode));
        let zone = process_common(builder, obj, cyfs.People);

        fs.outputFileSync(filepath, zone.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}

function process_simpleGroup(obj: any) {
    let filepath = save_path("simplegroup", obj.file)
    if (proc_in) {
        console.log("开始解码")
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let simplegroup_r = new cyfs.SimpleGroupDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (simplegroup_r.err) {
            console.error(`decode simplegroup from file ${obj.file} err ${simplegroup_r.val}`)
            ret = simplegroup_r.val.code
            return;
        }
        // 先检查通用数据部分
        let simplegroup = simplegroup_r.unwrap()
        if (check_common(simplegroup, obj)) {
            // 再检测content数据
            if (obj.threshold) {
                if (!simplegroup.desc().mn_key()?.threshold) {
                    output_check_err("threshold", obj.threshold, "undefined")
                    return
                }
                if (simplegroup.desc().mn_key()?.threshold !== obj.threshold) {
                    output_check_err("threshold", obj.threshold, simplegroup.desc().mn_key()!.threshold.toString())
                    return;
                }
            }
            if (obj.ood_list) {
                let deoodlist = simplegroup.body_expect().content().ood_list
                for (let i in deoodlist) {
                    if (deoodlist[i].to_base_58() !== obj.ood_list[i]) { output_check_err("ood_list", obj.ood_list, "oodlist属性解码后不一致"); return; }
                }
            }
            if (obj.ood_work_mode) {
                if (simplegroup.body_expect().content().ood_work_mode() !== obj.ood_work_mode) {
                    output_check_err("ood_work_mode", obj.ood_work_mode, simplegroup.body_expect().content().ood_work_mode())
                    return;
                }
            }
            if (obj.members) {
                let demembers = simplegroup.body_expect().content().members;
                for (let i in demembers) {
                    if (demembers[i].to_base_58() !== obj.members[i]) {
                        output_check_err("members", obj.members, "members内容不一致");
                        return;
                    }
                }
            }
            if (obj.owners) {
                let pklist = simplegroup.desc().mn_key()!.keys.value()
                if (!pklist) {
                    output_check_err("public_key", obj.owners, "undefined")
                    return false;
                }
                for (let j in pklist) {
                    let e_key = public_key(obj.owners[j]).toHex().unwrap()
                    let a_key = pklist[j].toHex().unwrap()
                    if (e_key !== a_key && obj.owners[j].split(":")[0] !== "random") {
                        output_check_err("public_key", e_key, a_key)
                        return false;
                    }
                }


            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        console.log("开始根据json创建对象")
        let ood_list: cyfs.DeviceId[] = [];
        if (obj.ood_list) {
            for (const ood of obj.ood_list) {
                ood_list.push(cyfs.DeviceId.from_base_58(ood).unwrap())
            }
        }
        let members: cyfs.ObjectId[] = []
        if (obj.members) {
            for (const object of obj.members) {
                members.push(cyfs.ObjectId.from_base_58(object).unwrap())
            }
        }
        let ood_work_mode
        if (obj.ood_work_mode === cyfs.OODWorkMode.Standalone || obj.ood_work_mode === cyfs.OODWorkMode.ActiveStandby) {
            ood_work_mode = obj.ood_work_mode as cyfs.OODWorkMode;
        }

        let builder = new cyfs.SimpleGroupBuilder(new cyfs.SimpleGroupDescContent(), new cyfs.SimpleGroupBodyContent(members, ood_list, ood_work_mode));
        let simplegroup = process_common(builder, obj, cyfs.SimpleGroup);

        fs.outputFileSync(filepath, simplegroup.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}

function process_device(obj: any) {
    let filepath = save_path("device", obj.file)
    if (proc_in) {
        console.log("开始解码")
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let device_r = new cyfs.DeviceDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (device_r.err) {
            console.error(`decode device from file ${obj.file} err ${device_r.val}`)
            ret = device_r.val.code
            return;
        }
        // 先检查通用数据部分
        let device = device_r.unwrap()
        if (check_common(device, obj)) {
            // 再检测content数据

            if (obj.endpoints) {
                let deendpoints = device.body_expect().content().endpoints()
                for (let i in deendpoints) {
                    let deendpoint = deendpoints[i].toString()
                    if (deendpoint !== obj.endpoints[i]) {
                        output_check_err("endpoints", obj.endpoints[i], deendpoint);
                        return;
                    }
                }
            }

            if (obj.sn_list) {
                let desn_list = device.body_expect().content().sn_list()
                for (let i in desn_list) {
                    if (desn_list[i].to_base_58() !== obj.sn_list[i]) { output_check_err("sn_list", obj.sn_list, "oodlist属性解码后不一致"); return; }
                }
            }
            if (obj.passive_sn_list) {
                let depassive_sn_list = device.body_expect().content().passive_pn_list()
                for (let i in depassive_sn_list) {
                    if (depassive_sn_list[i].to_base_58() !== obj.passive_sn_list[i]) { output_check_err("passive_sn_list", obj.passive_sn_list, "passive_sn_list属性解码后不一致"); return; }
                }
            }
            if (obj.unique_id) {
                if (!device.desc().content().unique_id()) {
                    output_check_err("unique_id", obj.unique_id, "undefined")
                    return;
                }

                let de_unique_id = device.desc().content().unique_id().to_base_58()

                if (obj.unique_id !== de_unique_id) { output_check_err("unique_id", obj.unique_id, de_unique_id); return; }

            }
            if (obj.name) {
                if (!device.body_expect().content().name()) {
                    output_check_err("name", obj.name, "undefined")
                    return;
                }
                if (obj.name.split(":")[1] === "mb") {
                    if (device.body_expect().content().name() !== fs.readFileSync(path.join(cyfs.get_temp_path(), "strfile.txt")).toString()) {
                        console.error(`大字符串解码后不一致: ${obj.name}`); return;
                    }

                }
                else if (device.body_expect().content().name() !== obj.name) {
                    output_check_err("name", obj.name, device.body_expect().content().name()!)
                    return;
                }
            }
        }
        console.log(`解码成功 casename is (${obj.casename})`)

    }
    else {
        // 从json创建对象
        console.log("开始根据json创建对象")
        let unique_id: cyfs.UniqueId
        if (obj.unique_id) {
            unique_id = cyfs.UniqueId.from_base_58(obj.unique_id).unwrap();
        }
        let endpoints: cyfs.Endpoint[] = []
        if (obj.endpoints) {
            for (let enstr of obj.endpoints) {
                endpoints.push(cyfs.Endpoint.fromString(enstr).unwrap())
            }
        }
        let sn_list: cyfs.DeviceId[] = []
        if (obj.sn_list) {
            for (let sl of obj.sn_list) {
                sn_list.push(cyfs.DeviceId.from_base_58(sl).unwrap())
            }
        }
        let passive_sn_list: cyfs.DeviceId[] = []
        if (obj.passive_sn_list) {
            for (let psl of obj.passive_sn_list) {
                passive_sn_list.push(cyfs.DeviceId.from_base_58(psl).unwrap())
            }
        }
        let name
        if (obj.name.split(":")[1] === "mb") { name = get_big_str(obj, "name") } else { name = obj.name }
        let builder = new cyfs.DeviceBuilder(new cyfs.DeviceDescContent(unique_id!), new cyfs.DeviceBodyContent(endpoints, sn_list, passive_sn_list, name));
        let device = process_common(builder, obj, cyfs.Device);

        fs.outputFileSync(filepath, device.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}

function process_unionAccount(obj: any) {
    let filepath = save_path("unionaccount", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let unionaccount_r = new cyfs.UnionAccountDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (unionaccount_r.err) {
            console.error(`decode unionaccount from file ${obj.file} err ${unionaccount_r.val}`)
            ret = unionaccount_r.val.code
            return;
        }

        // 先检查通用数据部分
        let unionaccount = unionaccount_r.unwrap()
        if (check_common(unionaccount, obj)) {
            // 再检测content数据
            if (obj.account1) {
                let deunionAccount1 = unionaccount.desc().content().left.to_base_58()

                if (deunionAccount1 !== obj.account1) { output_check_err("account1", obj.account1, deunionAccount1) }

            }

            if (obj.account2) {
                let deunionAccount2 = unionaccount.desc().content().right.to_base_58()

                if (deunionAccount2 !== obj.account2) { output_check_err("account2", obj.account2, deunionAccount2) }

            }
            if (obj.service_type) {
                let deservice_type = unionaccount.desc().content().service_type
                if (obj.service_type !== deservice_type) {
                    output_check_err("service_type", obj.service_type.toString(), deservice_type.toString())
                    return;
                }
            }

            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let account1: cyfs.ObjectId
        if (obj.account1) {
            account1 = cyfs.ObjectId.from_str(obj.account1).unwrap()
        }
        let account2: cyfs.ObjectId
        if (obj.account2) {
            account2 = cyfs.ObjectId.from_str(obj.account2).unwrap()
        }

        let builder = new cyfs.UnionAccountBuilder(new cyfs.UnionAccountDescContent(account1!, account2!, obj.service_type), new cyfs.UnionAccountBodyContent());
        let unionaccount = process_common(builder, obj, cyfs.UnionAccount);

        fs.outputFileSync(filepath, unionaccount.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}

function process_file(obj: any) {
    let filepath = save_path("file", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let file_r = new cyfs.FileDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (file_r.err) {
            console.error(`decode file from file ${obj.file} err ${file_r.val}`)
            ret = file_r.val.code
            return;
        }
        // 先检查通用数据部分
        let file = file_r.unwrap()
        if (check_common(file, obj)) {
            // 再检测content数据
            if (obj.len) {
                if (!file.desc().content().len) {
                    output_check_err("len", obj.len, "undefined")
                    return;
                }
                let delen = file.desc().content().len.toString()
                if (delen !== obj.len) {
                    output_check_err("len", obj.len, delen)
                    return;
                }
            }
            if (obj.hash) {
                if (!file.desc().content().hash) {
                    output_check_err("hash", obj.hash, "undefined")
                    return;
                }
                if (file.desc().content().hash.to_hex_string() !== obj.hash) {
                    output_check_err("hash", obj.hash, file.desc().content().hash.to_hex_string())
                    return;
                }
            }
            if (obj.chunk_list) {
                if (!file.body_expect().content().chunk_list) {
                    output_check_err("chunk_list", obj.chunk_list, "undefined")
                    return;
                }
                let dechunk_list = file.body_expect().content().chunk_list
                if (obj.chunk_list.chunk_in_list) {
                    console.log("obj.chunk_list.chunk_in_list")
                    let dechunk_in_list = dechunk_list.chunk_in_list!
                    for (let j in dechunk_in_list) {
                        if (dechunk_in_list[j].to_base_58() !== obj.chunk_list.chunk_in_list[j]) {
                            output_check_err("chunk_in_list", obj.chunk_list.chunk_in_list[j], dechunk_in_list[j].to_base_58())
                            return;
                        }
                    }
                }
                else if (obj.chunk_list.chunk_in_bundle) {
                    console.log("obj.chunk_list.chunk_in_bundle")
                    let dechunk_list_bundle = dechunk_list.chunk_in_bundle?.chunk_list!
                    for (let i in dechunk_list_bundle) {
                        if (dechunk_list_bundle[i].to_base_58() !== obj.chunk_list.chunk_in_bundle.chunk_list[i]) {
                            output_check_err("chunk_in_bundle", obj.chunk_list.chunk_in_bundle.chunk_list[i], dechunk_list_bundle[i].to_base_58())
                            return;
                        }
                    }
                }
                else if (obj.chunk_list.file_id) {
                    console.log("obj.chunk_list.file_id")
                    let defile_id = dechunk_list.file_id!.to_base_58()
                    if (defile_id !== obj.chunk_list.file_id) {
                        output_check_err("file_id", obj.chunk_list.file_id, defile_id)
                        return;
                    }
                }
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let len: cyfs.JSBI
        if (obj.len) {
            len = cyfs.JSBI.BigInt(obj.len)
        }
        let hash: cyfs.HashValue;
        if (obj.hash) {
            hash = cyfs.HashValue.from_hex_string(obj.hash).unwrap()
        }
        let chunk_list: cyfs.ChunkList
        if (obj.chunk_list) {
            let chunk_in_list: cyfs.ChunkId[] = []
            let file_id
            let chunk_in_bundle

            if (obj.chunk_list.chunk_in_list) {
                for (let j of obj.chunk_list.chunk_in_list) {
                    chunk_in_list.push(cyfs.ChunkId.from_base_58(j).unwrap())
                }
                chunk_list = new cyfs.ChunkList(chunk_in_list)
            }
            if (obj.chunk_list.file_id) {
                file_id = cyfs.FileId.from_base_58(obj.chunk_list.file_id).unwrap()
                chunk_list = new cyfs.ChunkList(undefined, file_id)

            }
            if (obj.chunk_list.chunk_in_bundle) {
                let chunk_bundle_list: cyfs.ChunkId[] = []
                for (let j of obj.chunk_list.chunk_in_bundle.chunk_list) {
                    chunk_bundle_list.push(cyfs.ChunkId.from_base_58(j).unwrap())
                }
                chunk_in_bundle = new cyfs.ChunkBundle(chunk_bundle_list, cyfs.ChunkBundleHashMethod.Serial)
                chunk_list = new cyfs.ChunkList(undefined, undefined, chunk_in_bundle)
            }
        }

        let builder = new cyfs.FileBuilder(new cyfs.FileDescContent(len!, hash!), new cyfs.FileBodyContent(chunk_list!));
        let file = process_common(builder, obj, cyfs.File);

        fs.outputFileSync(filepath, file.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}

function process_dir(obj: any) {
    let filepath = save_path("dir", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let dir_r = new cyfs.DirDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (dir_r.err) {
            console.error(`decode file from file ${obj.file} err ${dir_r.val}`)
            ret = dir_r.val.code
            return;
        }
        // 先检查通用数据部分
        let dir = dir_r.unwrap()
        if (check_common(dir, obj)) {
            // 再检测content数据
            if (obj.attributes) {
                if (!dir.desc().content().attributes().flags) {
                    output_check_err("attributes", obj.attributes, "undefined")
                    return;
                }
                let deattributes = dir.desc().content().attributes().flags
                if (deattributes !== obj.deattributes) {
                    output_check_err("attributes", obj.attributes.toString(), deattributes.toString())
                    return;
                }
            }
            if (obj.obj_list) {
                if (!dir.desc().content().obj_list()) {
                    output_check_err("hash", obj.hash, "undefined")
                    return;
                }
                if (obj.obj_list.info.obj_list.object_map.innernodeinfo.node.object_id) {
                    let desc_buffer = decoder(obj.obj_list.info.obj_list.object_map.innernodeinfo.node.object_id)
                    let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();
                    let fileId = target.desc().calculate_id()
                    //获取Dir对象中file的id和chunkid
                    let file_raw: any = dir.body_expect().content().match<Uint8Array | undefined>({
                        Chunk: () => { return undefined },
                        ObjList: (list) => {
                            return list.get(fileId)?.buffer;
                        }
                    })!;
                    let [file_target, unit]: [cyfs.File, Uint8Array] = new cyfs.FileDecoder().raw_decode(file_raw).unwrap()
                    //let [chunkinlist_deco]: any = file_target.body_expect().content().chunk_list.chunk_in_list
                    let FileId_deco = file_target.desc().calculate_id()
                    if (FileId_deco.to_base_58() !== fileId.to_base_58()) {
                        output_check_err("fileId不匹配", fileId.to_base_58(), FileId_deco.to_base_58())
                        return;
                    }
                }
            }
            if (obj.body) {
                if (!dir.body_expect().content()) {
                    output_check_err("body", obj.body, "undefined")
                    return;
                }
                if (obj.body.chunck_id) { }
                if (obj.body.obj_list) {
                    let desc_buffer = decoder(obj.body.obj_list.fileid)
                    let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();
                    let fileId = target.desc().calculate_id()
                    //获取Dir对象中file的id和chunkid
                    let file_raw: any = dir.body_expect().content().match<Uint8Array | undefined>({
                        Chunk: () => { return undefined },
                        ObjList: (list) => {
                            return list.get(fileId)?.buffer;
                        }
                    })!;
                    let [file_target, unit]: [cyfs.File, Uint8Array] = new cyfs.FileDecoder().raw_decode(file_raw).unwrap()
                    //let [chunkinlist_deco]: any = file_target.body_expect().content().chunk_list.chunk_in_list
                    let FileId_deco = file_target.desc().calculate_id()
                    if (FileId_deco.to_base_58() !== fileId.to_base_58()) {
                        output_check_err("fileId不匹配", fileId.to_base_58(), FileId_deco.to_base_58())
                        return;
                    }
                    if (desc_buffer.toString() !== file_raw.toString()) {
                        output_check_err("file buffer不匹配", desc_buffer.toString(), file_raw.toString())
                        return;
                    }
                }

            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        //obj_list
        let infochunkId: cyfs.ChunkId | undefined = undefined;
        let infoobjList: cyfs.NDNObjectList | undefined = undefined;
        if (obj.obj_list.info.chunck_id) {
            infochunkId = cyfs.ChunkId.from_base_58("").unwrap()
        }
        if (obj.obj_list.info.obj_list) {
            let parent_chunk: cyfs.ChunkId | undefined = undefined
            let object_map: cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.InnerNodeInfo> | undefined = undefined
            if (obj.obj_list.info.obj_list.parent_chunk) {
            }
            if (obj.obj_list.info.obj_list.object_map) {
                let fileId: cyfs.ObjectId | undefined = undefined
                let node_chunkId: cyfs.ChunkId | undefined = undefined;
                let Index: { offset: number, size: number } | undefined = undefined
                if (obj.obj_list.info.obj_list.object_map.innernodeinfo.node.object_id) {
                    let desc_buffer = decoder(obj.obj_list.info.obj_list.object_map.innernodeinfo.node.object_id)
                    let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();
                    fileId = target.desc().calculate_id()
                }
                if (obj.obj_list.info.obj_list.object_map.innernodeinfo.node.chunck_id) {
                    node_chunkId = cyfs.ChunkId.from_base_58(obj.obj_list.info.obj_list.object_map.innernodeinfo.node.chunck_id).unwrap()
                }
                if (obj.obj_list.info.obj_list.object_map.innernodeinfo.node.index) {
                    Index = obj.obj_list.info.obj_list.object_map.innernodeinfo.index
                }
                console.log(`file_objectId ${fileId}`);
                let id = {
                    object_id: fileId,
                    chunk_id: node_chunkId,
                    index: Index
                }
                let attributes0 = new cyfs.Attributes(obj.obj_list.info.obj_list.object_map.innernodeinfo.attributes)
                let node = new cyfs.InnerNode(id)
                let k = new cyfs.BuckyString(obj.obj_list.info.obj_list.object_map.buckystring)
                let v = new cyfs.InnerNodeInfo(attributes0, node)
                object_map = new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.InnerNodeInfo>()
                object_map.set(k, v)
            }
            infoobjList = new cyfs.NDNObjectList(
                parent_chunk,
                object_map
            )
        }
        let info = {
            chunk_id: infochunkId,
            obj_list: infoobjList
        }
        let obj_list = new cyfs.NDNObjectInfo(info)

        //body
        let bodychunkId: cyfs.ChunkId | undefined = undefined;
        let bodyobjList: cyfs.BuckyHashMap<cyfs.ObjectId, cyfs.BuckyBuffer> | undefined = undefined
        if (obj.body.chunck_id) {
            bodychunkId = cyfs.ChunkId.from_base_58(obj.body.chunck_id).unwrap()
        }
        if (obj.body.obj_list) {
            let desc_buffer = decoder(obj.body.obj_list.fileid)
            let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();
            let fileId = target.desc().calculate_id()
            let buf = new cyfs.BuckyBuffer(desc_buffer)
            bodyobjList = new cyfs.BuckyHashMap<cyfs.ObjectId, cyfs.BuckyBuffer>()
            bodyobjList.set(fileId, buf)
        }
        let body = {
            chunk_id: bodychunkId,
            obj_list: bodyobjList
        }
        let attributes = new cyfs.Attributes(obj.attributes)
        let builder = new cyfs.DirBuilder(new cyfs.DirDescContent(attributes, obj_list), new cyfs.DirBodyContent(body));
        let dir = process_common(builder, obj, cyfs.Dir);
        fs.outputFileSync(filepath, dir.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}

function process_proofos(obj: any) {
    let filepath = save_path("proofos", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let zone_r = new cyfs.ProofOfServiceDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (zone_r.err) {
            console.error(`decode zone from file ${obj.file} err ${zone_r.val}`)
            ret = zone_r.val.code
            return;
        }

        // 先检查通用数据部分
        let proofos = zone_r.unwrap()
        if (check_common(proofos, obj)) {
            // 再检测content数据
            // if (obj.ood_list) {
            //     let deoodlist = zone.body_expect().content().ood_list
            //     // TODO: 自己填写检测逻辑
            //     for (let i in deoodlist) {
            //         if (deoodlist[i].to_base_58() !== obj.ood_list[i]) { output_check_err("ood_list", obj.ood_list, "oodlist属性解码后不一致") }
            //     }
            // }
            // if (obj.icon) {
            //     if (!zone.body_expect().content().icon) {
            //         output_check_err("icon", obj.icon, "undefined")
            //         return;
            //     }

            //     if (zone.body_expect().content().icon!.to_base_58() !== obj.icon) {
            //         output_check_err("icon", obj.icon, zone.body_expect().content().icon!.to_base_58())
            //         return;
            //     }
            // }
            // if (obj.name) {
            //     if (!zone.body_expect().content().name) {
            //         output_check_err("name", obj.name, "undefined")
            //         return;
            //     }
            //     if (obj.name.split(":")[1] === "mb") {
            //         if (zone.body_expect().content().name !== fs.readFileSync(path.join(cyfs.get_temp_path(), "strfile.txt")).toString()) {
            //             console.error(`大字符串解码后不一致: ${obj.name}`); return;
            //         }

            //     }
            //     else if (zone.body_expect().content().name !== obj.name) {
            //         output_check_err("name", obj.name, zone.body_expect().content().name!)
            //         return;
            //     }
            // }
            // if (obj.ood_work_mode) {
            //     if (zone.body_expect().content().ood_work_mode() !== obj.ood_work_mode) {
            //         output_check_err("ood_work_mode", obj.ood_work_mode, zone.body_expect().content().ood_work_mode())
            //         return;
            //     }
            // }
            // console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let proof_type: cyfs.ProofTypeCode
        let data_0: cyfs.ProofData
        let data_1: cyfs.ProofData

        proof_type = new cyfs.ProofTypeCode();
        let buf = get_len_buf(10)
        data_0 = new cyfs.ProofData(buf)
        let buf1 = get_len_buf(10)
        data_1 = new cyfs.ProofData(buf1)

        // 创建DescContent部分
        let desc_content = new cyfs.ProofOfServiceDescContent(proof_type, data_0);

        // 创建BodyContent部分
        let body_content = new cyfs.ProofOfServiceBodyContent(data_1);

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.ProofOfServiceBuilder(desc_content, body_content);
        let proofos = process_common(builder, obj, cyfs.ProofOfService);
        fs.outputFileSync(filepath, proofos.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_zone(obj: any) {
    let filepath = save_path("zone", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let zone_r = new cyfs.ZoneDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (zone_r.err) {
            console.error(`decode zone from file ${obj.file} err ${zone_r.val}`)
            ret = zone_r.val.code
            return;
        }
        // 先检查通用数据部分
        let zone = zone_r.unwrap()
        if (check_common(zone, obj)) {
            // 再检测content数据
            if (obj.ood_work_mode) {
                if (zone.body_expect().content().ood_work_mode() !== obj.ood_work_mode) {
                    output_check_err("ood_work_mode", obj.ood_work_mode, zone.body_expect().content().ood_work_mode())
                    return;
                }
            }
            if (obj.ood_list) {
                let deoodlist = zone.body_expect().content().ood_list()
                // TODO: 自己填写检测逻辑
                console.log(`objList==== ${obj.ood_list}`);
                for (let i in deoodlist) {
                    compare_arrays_len(deoodlist, obj.ood_list)
                    if (deoodlist[i].to_base_58() !== obj.ood_list[i]) { output_check_err("ood_list", obj.ood_list[i], deoodlist[i].to_base_58()); return; }
                }
            }
            if (obj.known_device_list) {
                let deknown_device_list = zone.body_expect().content().known_device_list()
                // TODO: 自己填写检测逻辑
                for (let i in deknown_device_list) {
                    if (deknown_device_list[i].to_base_58() !== obj.known_device_list[i]) { output_check_err("known_device_list", obj.known_device_list[i], deknown_device_list[i].to_base_58()); return; }
                }
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let owner = cyfs.ObjectId.from_base_58(obj.owner).unwrap()
        let ood_work_mode = obj.ood_work_mode
        let ood_list: cyfs.DeviceId[] = [];
        for (const ood of obj.ood_list) {
            ood_list.push(cyfs.DeviceId.from_base_58(ood).unwrap())
        }
        let known_device_list: cyfs.DeviceId[] = []
        for (const device of obj.known_device_list) {
            known_device_list.push(cyfs.DeviceId.from_base_58(device).unwrap())
        }
        // 创建DescContent部分
        let desc_content = new cyfs.ZoneDescContent(owner);
        // 创建BodyContent部分
        let body_content = new cyfs.ZoneBodyContent(ood_work_mode, ood_list, known_device_list);

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.ZoneBuilder(desc_content, body_content);
        let zone = process_common(builder, obj, cyfs.Zone);
        fs.outputFileSync(filepath, zone.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}


function main() {
    let json_path = process_argv();
    if (!json_path) {
        return
    }

    let obj = JSON.parse(fs.readFileSync(json_path, { encoding: 'utf-8' }));

    switch (obj.type) {
        case "people":
            process_people(obj)
            break;
        case "device":
            process_device(obj)
            break;
        case "unionaccount":
            process_unionAccount(obj)
            break;
        case "dir":
            process_dir(obj)
            break;
        case "file":
            process_file(obj)
            break;
        case "simplegroup":
            process_simpleGroup(obj)
            break;
        case "proofofservice":
            process_proofos(obj)
            break;
        case "zone":
            process_zone(obj);
            break;
        case "decapp": break;
        case "nftlist": break;
        case "friendlist": break;
        case "storage": break;
        case "msg": break;
        case "addfriend": break;
        case "": break;
        case "": break;
        case "": break;
        case "": break;
        case "": break;
        case "": break;

        default:
            console.error(`unsupport type`, obj.type)
            break;
    }
}

main()
process.exit(ret)