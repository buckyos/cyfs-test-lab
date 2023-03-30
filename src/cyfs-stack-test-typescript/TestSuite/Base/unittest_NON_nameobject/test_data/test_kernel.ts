import * as cyfs from "../../../../cyfs_node"
import * as path from 'path'


import * as fs from 'fs-extra'
import { FileId, Msg } from "../../../../cyfs_node";

let proc_in: boolean | undefined = undefined;
let ret = 0;

function print_usage() {
    console.log("usage: ts-node test_kernel.ts [--in|--out] <json file path>")
}

export function process_argv(): string | undefined {
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

    if (obj.option_dec_id) {
        let decid = cyfs.ObjectId.from_base_58(obj.option_dec_id).unwrap()
        builder = builder.option_dec_id(decid)
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

        proof_type = cyfs.ProofTypeCode.DSGStorage();
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
function process_appList(obj: any) {
    let filepath = save_path("applist", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let applist_r = new cyfs.AppListDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (applist_r.err) {
            console.error(`decode applist from file ${obj.file} err ${applist_r.val}`)
            ret = applist_r.val.code
            return;
        }
        // 先检查通用数据部分
        let applist = applist_r.unwrap()
        if (check_common(applist, obj)) {
            // 再检测content数据

            if (applist.desc().content().id !== obj.id) {
                output_check_err("id", obj.id, applist.desc().content().id)
                return;
            }
            if (applist.desc().content().category !== obj.category) {
                output_check_err("category", obj.category, applist.desc().content().category)
                return;
            }

            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = obj.id
        let category = obj.category
        // 创建DescContent部分
        let desc_content = new cyfs.AppListDescContent(id, category);
        // 创建BodyContent部分
        let body_content = new cyfs.AppListBodyContent(new cyfs.BuckyHashMap());

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.AppListBuilder(desc_content, body_content);
        let applist = process_common(builder, obj, cyfs.AppList);
        fs.outputFileSync(filepath, applist.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_appLocalStatus(obj: any) {
    let filepath = save_path("applocalstatus", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.AppLocalStatusDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode applocallist from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().id.to_base_58() !== obj.id) {
                output_check_err("id", obj.id, deobject.desc().content().id.to_base_58())
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = obj.id
        // 创建DescContent部分
        let desc_content = new cyfs.AppLocalStatusDesc(id, cyfs.AppLocalStatusCode.Init, new cyfs.BuckyHashMap(), new cyfs.AppQuota(cyfs.JSBI.BigInt(0), cyfs.JSBI.BigInt(0), cyfs.JSBI.BigInt(0)));
        // 创建BodyContent部分
        let body_content = new cyfs.EmptyProtobufBodyContent();

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.AppLocalStatusBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.AppLocalStatus);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_decApp(obj: any) {
    let filepath = save_path("decapp", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.DecAppDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode decapp from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().id !== obj.id) {
                output_check_err("id", obj.id, deobject.desc().content().id)
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = obj.id
        // 创建DescContent部分
        let desc_content = new cyfs.DecAppDescContent(id);
        // 创建BodyContent部分
        let body_content = new cyfs.DecAppBodyContent(new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.ObjectId>(), undefined, undefined, new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.BuckyString>(), new cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.BuckyString>());

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.DecAppBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.DecApp);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_appStatus(obj: any) {
    let filepath = save_path("appstatus", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.AppStatusDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode decapp from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().id.to_base_58() !== obj.id) {
                output_check_err("id", obj.id, deobject.desc().content().id.to_base_58())
                return;
            }
            if (deobject.body_expect().content().status !== obj.status) {
                output_check_err("status", obj.status, deobject.body_expect().content().status.toString())
                return;
            }
            if (deobject.body_expect().content().version !== obj.version) {
                output_check_err("version", obj.version, deobject.body_expect().content().version)
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = cyfs.DecAppId.from_base_58(obj.id).unwrap()
        let version = obj.version
        let status = obj.status
        // 创建DescContent部分
        let desc_content = new cyfs.AppStatusDescContent(id);
        // 创建BodyContent部分
        let body_content = new cyfs.AppStatusBodyContent(version, status);

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.AppStatusBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.AppStatus);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_textObject(obj: any) {
    let filepath = save_path("textobject", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.TextObjectDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode textobject from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().id !== obj.id) {
                output_check_err("id", obj.id, deobject.desc().content().id)
                return;
            }
            if (deobject.desc().content().header !== obj.header) {
                output_check_err("header", obj.header, deobject.desc().content().header)
                return;
            }
            if (deobject.body_expect().content().value !== obj.value) {
                output_check_err("value", obj.value, deobject.body_expect().content().value)
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = obj.id
        let header = obj.header
        let value = obj.value
        // 创建DescContent部分
        let desc_content = new cyfs.TextObjectDescContent(id, header);
        // 创建BodyContent部分
        let body_content = new cyfs.TextObjectBodyContent(value);

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.TextObjectBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.TextObject);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_appStoreList(obj: any) {
    let filepath = save_path("appstorelist", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.AppStoreListDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode appstorelist from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据

            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象

        // 创建DescContent部分
        let desc_content = new cyfs.AppStoreListDescContent();
        // 创建BodyContent部分
        let body_content = new cyfs.AppStoreListBodyContent(new cyfs.BuckyHashSet());

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.AppStoreListBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.AppStoreList);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_appExtInfo(obj: any) {
    let filepath = save_path("appextinfo", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.AppExtInfoDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode appextinfo from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().id !== obj.id) {
                output_check_err("id", obj.id, deobject.desc().content().id)
                return;
            }
            if (deobject.body_expect().content().info !== obj.info) {
                output_check_err("info", obj.info, deobject.body_expect().content().info)
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = obj.id
        let info = obj.info
        // 创建DescContent部分
        let desc_content = new cyfs.AppExtInfoDescContent(id);
        // 创建BodyContent部分
        let body_content = new cyfs.AppExtInfoBodyContent(info);

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.AppExtInfoBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.AppExtInfo);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_transContext(obj: any) {
    let filepath = save_path("transcontext", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.TransContextDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode transcontext from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().context_path !== obj.context_path) {
                output_check_err("context_path", obj.context_path, deobject.desc().content().context_path)
                return;
            }
            let dl = deobject.body_expect().content().device_list
            for (let i in dl) {
                if (dl[i].target.to_base_58() !== obj.device_list[i][0]) {
                    output_check_err("device_list", obj.device_list[i][0], dl[i].target.to_base_58())
                    return;
                }
            }

            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let context_path = obj.context_path
        let device_list: cyfs.TransContextDevice[] = []
        for (let index of obj.device_list) {
            let chunkdescmode: cyfs.ChunkCodecDesc = cyfs.ChunkCodecDesc.Unknown()
            let deviceid = cyfs.DeviceId.from_base_58(index[0]).unwrap()
            if (index[1] == "stream") {
                chunkdescmode = cyfs.ChunkCodecDesc.Stream(1, 1, 1)
            } else if (index[1] == "raptor") {
                chunkdescmode = cyfs.ChunkCodecDesc.Raptor(1, 1, 1)
            }
            device_list.push(new cyfs.TransContextDevice(deviceid, chunkdescmode));
        }
        const path = cyfs.TransContextPath.fix_path(context_path);
        // 创建DescContent部分
        let desc_content = new cyfs.TransContextDescContent(path);
        // 创建BodyContent部分
        let body_content = new cyfs.TransContextBodyContent(device_list);

        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.TransContextBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.TransContext);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_nftList(obj: any) {
    let filepath = save_path("nftlist", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.TransContextDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode nftlist from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().context_path !== obj.context_path) {
                output_check_err("context_path", obj.context_path, deobject.desc().content().context_path)
                return;
            }
            let dl = deobject.body_expect().content().device_list
            for (let i in dl) {
                if (dl[i].target.to_base_58() !== obj.device_list[i][0]) {
                    output_check_err("device_list", obj.device_list[i][0], dl[i].target.to_base_58())
                    return;
                }
            }

            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let lenstr = '18446744073709551615'
        let len = cyfs.JSBI.BigInt(lenstr)
        let desc_buffer = decoder(__dirname + '/test-tool/tool/test_config/test_file.desc')
        let [target, buffer] = new cyfs.FileDecoder().raw_decode(desc_buffer).unwrap();
        let desc = target.desc().content().hash
        let list: cyfs.FileDesc[] = []


        for (let l of obj.list) {

            list = [new cyfs.FileDesc(undefined, undefined, undefined, undefined, undefined, undefined, new cyfs.FileDescContent(len, desc), undefined, undefined, undefined, undefined)]


        }
        // 创建DescContent部分
        let desc_content = new cyfs.NFTListDescContent(list);
        // 创建BodyContent部分
        let body_content = new cyfs.EmptyProtobufBodyContent();
        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.NFTListBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.NFTList);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_Storage(obj: any) {
    let filepath = save_path("storage", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.StorageDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode storage from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().id() !== obj.id) {
                output_check_err("id", obj.id, deobject.desc().content().id())
                return;
            }
            let deu8 = deobject.body_expect().content().value().toString()
            console.log("-=-=-=-=-=-=-=deu8:" + deu8);
            let value = new Uint8Array(obj.value).toString();
            if (deu8 !== value) {
                output_check_err("value", obj.value, deu8)
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = obj.id
        let value = new Uint8Array(obj.value);
        // 创建DescContent部分
        let desc_content = new cyfs.StorageDescContent(id);
        // 创建BodyContent部分
        let body_content = new cyfs.StorageBodyContent(value);
        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.StorageBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.Storage);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_addFriend(obj: any) {
    let filepath = save_path("addfriend", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.AddFriendDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode addfriend from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().to.to_base_58() !== obj.to) {
                output_check_err("to peopleid", obj.to, deobject.desc().content().to.to_base_58())
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let to = cyfs.PeopleId.from_base_58(obj.to).unwrap()
        // 创建DescContent部分
        let desc_content = new cyfs.AddFriendDescContent(to);
        // 创建BodyContent部分
        let body_content = new cyfs.EmptyProtobufBodyContent();
        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.AddFriendBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.AddFriend);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_removeFriend(obj: any) {
    let filepath = save_path("removefriend", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.RemoveFriendDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode removefriend from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().to.to_base_58() !== obj.to) {
                output_check_err("to peopleid", obj.to, deobject.desc().content().to.to_base_58())
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let to = cyfs.PeopleId.from_base_58(obj.to).unwrap()
        // 创建DescContent部分
        let desc_content = new cyfs.RemoveFriendDescContent(to);
        // 创建BodyContent部分
        let body_content = new cyfs.EmptyProtobufBodyContent();
        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.RemoveFriendBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.RemoveFriend);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_appLocalList(obj: any) {
    let filepath = save_path("applocallist", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.AppLocalListDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode applocallist from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            if (deobject.desc().content().id !== obj.id) {
                output_check_err("id", obj.id, deobject.desc().content().id)
                return;
            }

            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = obj.id
        let value = new Uint8Array(obj.value);
        // 创建DescContent部分
        let desc_content = new cyfs.AppLocalListDescContent(id, new cyfs.BuckyHashSet());
        // 创建BodyContent部分
        let body_content = new cyfs.EmptyProtobufBodyContent();
        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.AppLocalListBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.AppLocalList);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_appSetting(obj: any) {
    let filepath = save_path("appsetting", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.AppSettingDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode appsetting from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            let decappid = deobject.desc().content().id.to_base_58()
            if (decappid !== obj.id) {
                output_check_err("decappid", obj.id, decappid)
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let id = obj.id
        // 创建DescContent部分
        let desc_content = new cyfs.AppSettingDesc(id, false);
        // 创建BodyContent部分
        let body_content = new cyfs.EmptyProtobufBodyContent();
        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.AppSettingBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.AppSetting);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_friendOption(obj: any) {
    let filepath = save_path("friendoption", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.FriendOptionDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode friendoption from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            let deo = deobject.desc().content().auto_confirm
            if (deo !== obj.auto_confirm) {
                output_check_err("auto_confirm", obj.auto_confirm, `${deo}`)
                return;
            }
            let msg = deobject.desc().content().msg
            if (msg !== obj.msg) {
                output_check_err("msg", obj.msg, msg!)
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let msg = obj.msg
        let auto_confirm = obj.auto_confirm;
        // 创建DescContent部分
        let desc_content = new cyfs.FriendOptionDescContent(auto_confirm, msg);
        // 创建BodyContent部分
        let body_content = new cyfs.EmptyProtobufBodyContent();
        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.FriendOptionBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.FriendOption);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_Msg(obj: any) {
    let filepath = save_path("msg", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.MsgDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode msg from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            let deo = deobject.desc().content().to.to_base_58()
            if (deo !== obj.to) {
                output_check_err("msg.to", obj.to, deo)
                return;
            }
            let demc = deobject.desc().content().content;
            let mc
            if (obj.content.text) {
                mc = cyfs.MsgContent.Text(obj.content.text);
            }
            if (obj.content.object) {
                let id = cyfs.ObjectId.from_base_58(obj.content.object.id).unwrap()
                let MsgObjectContent = new cyfs.MsgObjectContent(id, obj.content.object.name)
                mc = cyfs.MsgContent.Object(MsgObjectContent)
            }
            if (demc !== mc) {
                output_check_err("msg.to", obj.to, deo)
                return;
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }
    } else {
        // 从json创建对象
        let to = cyfs.ObjectId.from_base_58(obj.to).unwrap()

        let content: cyfs.MsgContent
        {
            if (obj.content.text) { content = cyfs.MsgContent.Text(obj.content.text) }
            else if (obj.content.object) {
                let id = cyfs.ObjectId.from_base_58(obj.content.object.id).unwrap()
                let MsgObjectContent = new cyfs.MsgObjectContent(id, obj.content.object.name)
                content = cyfs.MsgContent.Object(MsgObjectContent)
            }
            else {console.error("未有输入msgcontent");
            }
        }
        // 创建DescContent部分
        let desc_content = new cyfs.MsgDescContent(to, content!);
        // 创建BodyContent部分
        let body_content = new cyfs.EmptyProtobufBodyContent();
        // 创建一个Builder，并完成对象的构建
        let builder = new cyfs.MsgBuilder(desc_content, body_content);
        let newobject = process_common(builder, obj, cyfs.Msg);
        fs.outputFileSync(filepath, newobject.to_vec().unwrap());
        console.log(`编码输出路径：${filepath}`)
    }
}
function process_appCmd(obj: any) {
    let filepath = save_path("appcmd", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let object_r = new cyfs.AppCmdDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (object_r.err) {
            console.error(`decode storage from file ${obj.file} err ${object_r.val}`)
            ret = object_r.val.code
            return;
        }
        // 先检查通用数据部分
        let deobject = object_r.unwrap()
        if (check_common(deobject, obj)) {
            // 再检测content数据
            let deappid = deobject.desc().content().app_id.to_base_58()
            if (deappid !== obj.id) {
                output_check_err("appcmd_appid", obj.id, `${deappid}`)
                return;
            }
            let decode = deobject.desc().content().cmd_code.code.valueOf();
            if (decode !== obj.code) {
                output_check_err("appcmd_code", obj.code, decode.toString())
                return;
            }
            if (obj.code == 0) {
                let deownerid = deobject.desc().content().cmd_code.add?.app_owner_id?.to_base_58();
                if (deownerid !== obj.owner) {
                    output_check_err("addapp_ownerid", obj.owner, deownerid!)
                    return;
                }
            }
            if (obj.code == 8) {
                let deauto_update = deobject.desc().content().cmd_code.auto_update;
                if (deauto_update !== obj.auto_update) {
                    output_check_err("appcmd_auto_update", obj.auto_update, `${deauto_update}`)
                    return;
                }
            }
            if (obj.code == 2) {
                let deinstall = deobject.desc().content().cmd_code.install?.run_after_install;
                let deinversion = deobject.desc().content().cmd_code.install?.ver;
                if (deinstall !== obj.install[1]) {
                    output_check_err("appcmd_install", obj.install[1], `${deinstall}`)
                    return;
                }
                if (deinversion !== obj.install[0]) {
                    output_check_err("appcmd_version", obj.deinversion, `${deinversion}`)
                    return;
                }
            }
            if (obj.code == 6) {
                let depermission = deobject.desc().content().cmd_code.permission?.permission.get(obj.permission[0]);
                if (depermission !== obj.permission[1]) {
                    output_check_err("appcmd_permission", obj.permission, `${depermission}`)
                    return;
                }
            }
            if (obj.code == 7) {
                let dequota_cpu = deobject.desc().content().cmd_code.quota?.cpu;
                let dequota_disk = deobject.desc().content().cmd_code.quota?.disk_space;
                let dequota_mem = deobject.desc().content().cmd_code.quota?.mem;
                if (dequota_mem?.toString() !== obj.quota[0].toString()) {
                    output_check_err("appcmd_quota_mem", obj.quota[0], `${dequota_mem}`)
                    return;
                }
                if (dequota_disk?.toString() !== obj.quota[1].toString()) {
                    output_check_err("appcmd_quota_disk", obj.quota[1], `${dequota_disk}`)
                    return;
                }
                if (dequota_cpu?.toString() !== obj.quota[2].toString()) {
                    output_check_err("appcmd_quota_cpu", obj.quota[2], `${dequota_cpu}`)
                    return;
                }
            }
            console.log(`解码成功 casename is (${obj.casename})`)
        }

    }
    else {
        // 从json创建对象
        let owner = cyfs.ObjectId.from_base_58(obj.owner).unwrap()
        let decid = cyfs.DecAppId.from_base_58(obj.id).unwrap()
        let newobject: cyfs.NamedObject<cyfs.AppCmdDesc, cyfs.EmptyProtobufBodyContent>
        if (obj.code == 0) {
            newobject = cyfs.AppCmd.add(owner, decid, owner)
        }
        else if (obj.code == 1) { newobject = cyfs.AppCmd.remove(owner, decid) }
        else if (obj.code == 2) { newobject = cyfs.AppCmd.install(owner, decid, obj.install[0], obj.install[1]) }
        else if (obj.code == 3) { newobject = cyfs.AppCmd.uninstall(owner, decid) }
        else if (obj.code == 4) { newobject = cyfs.AppCmd.start(owner, decid) }
        else if (obj.code == 5) { newobject = cyfs.AppCmd.stop(owner, decid) }
        else if (obj.code == 6) {
            let map = new Map();
            map.set(obj.permission[0], obj.permission[1])
            newobject = cyfs.AppCmd.set_permission(owner, decid, map)
        }
        else if (obj.code == 7) {
            let map = new Map();
            map.set(0, obj.quota[0])
            map.set(1, obj.quota[1])
            map.set(2, obj.quota[2])
            newobject = cyfs.AppCmd.set_quota(owner, decid, map)
        }
        else if (obj.code == 8) { newobject = cyfs.AppCmd.set_auto_update(owner, decid, obj.auto_update) }
        else {
            console.error("appcmdcode输入有误");
        }
        fs.outputFileSync(filepath, newobject!.to_vec().unwrap());
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
        case "applist": process_appList(obj); break;
        case "applocalstatus": process_appLocalStatus(obj); break;
        case "decapp": process_decApp(obj); break;
        case "appstatus": process_appStatus(obj); break;
        case "textobject": process_textObject(obj); break;
        case "appstorelist": process_appStoreList(obj); break;
        case "appextinfo": process_appExtInfo(obj); break;
        case "transcontext": process_transContext(obj); break;
        case "nftlist": process_nftList(obj); break;
        case "storage": process_Storage(obj); break;
        case "addfriend": process_addFriend(obj); break;
        case "removefriend": process_removeFriend(obj); break;
        case "appcmd": process_appCmd(obj); break;
        case "applocallist": process_appLocalList(obj); break;
        case "appsetting": process_appSetting(obj); break;
        case "friendoption": process_friendOption(obj); break;
        case "msg": process_Msg(obj); break;
        case "": break;
        case "": break;

        default:
            console.error(`unsupport type`, obj.type)
            break;
    }
}

main()
process.exit(ret)