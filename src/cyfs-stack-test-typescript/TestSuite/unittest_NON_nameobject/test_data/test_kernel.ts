import * as cyfs from '../../../cyfs_node/cyfs_node';
import * as path from 'path'


import * as fs from 'fs-extra'

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

function public_key_list(params: string[]): cyfs.PublicKey[] {
    let pklist: cyfs.PublicKey[] = []
    for (let j of params) {
        pklist.push(public_key(j))
    }
    return pklist
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

function save_path(nameobject: string, filename: string): string {
    console.log("创建编码文件")
    let basepath = path.join(path.join(cyfs.get_temp_path(), "test_nameObject_ts"), nameobject)
    fs.ensureDirSync(basepath);
    let filepath = path.join(basepath, filename)
    return filepath;
}

function process_common<DC extends cyfs.DescContent, BC extends cyfs.BodyContent, T extends cyfs.NamedObject<DC, BC>>
    (builder: cyfs.NamedObjectBuilder<DC, BC>, obj: any,
        constructor: new (desc: cyfs.NamedObjectDesc<DC>, body: cyfs.Option<cyfs.ObjectMutBody<DC, BC>>, signs: cyfs.ObjectSigns, nonce: cyfs.Option<cyfs.JSBI>) => T): T {
    if (obj.owner) {
        builder = builder.owner(cyfs.ObjectId.from_base_58(obj.owner).unwrap())
    }

    if (obj.area) {
        builder = builder.area(cyfs.Area.from_str(obj.area).unwrap())
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

    // 这里是通用的，再往下加参数就行了，前边不用动

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

        if (actual.desc().owner()!.is_none()) {
            output_check_err("owner", except.owner, "none")
            return false;
        }

        if (actual.desc().owner()!.unwrap().to_base_58() !== except.owner) {
            output_check_err("owner", except.owner, actual.desc().owner()!.unwrap().to_base_58())
            return false;
        }
    }

    if (except.area) {
        if (!actual.desc().area()) {
            output_check_err("area", except.area, "undefined")
            return false;
        }

        if (actual.desc().area()!.is_none()) {
            output_check_err("area", except.area, "none")
            return false;
        }

        if (actual.desc().area()!.unwrap().toString() !== except.area) {
            output_check_err("area", except.area, actual.desc().area()!.unwrap().toString())
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
    let filepath = save_path("people", obj.file)
    if (proc_in) {
        if (!fs.existsSync(filepath)) {
            console.error(`endecode file ${filepath} is not exist！ please check json file`)
        }
        let people_r = new cyfs.PeopleDecoder().from_raw(new Uint8Array(fs.readFileSync(filepath)))
        if (people_r.err) {
            console.error(`decode people from file ${obj.file} err ${people_r.val}`)
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
        let people = process_common(builder, obj, cyfs.People);

        fs.outputFileSync(filepath, people.to_vec().unwrap());
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
                    let e_key = public_key(obj.owners[j]).toHex().unwrap();
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
        let people = process_common(builder, obj, cyfs.SimpleGroup);

        fs.outputFileSync(filepath, people.to_vec().unwrap());
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
                    let e_endpoint = cyfs.Endpoint.fromString(obj.endpoints[i]).unwrap()
                    if (deendpoints[i] !== e_endpoint) {
                        output_check_err("endpoints", obj.endpoints, "endpoints内容不一致");
                        return;
                    }
                }


            }
           
            if (obj.sn_list){}
            if (obj.passive_sn_list){}
            if (obj.unique_id){}

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
        let people = process_common(builder, obj, cyfs.SimpleGroup);

        fs.outputFileSync(filepath, people.to_vec().unwrap());
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
        case "devcie":

            break;
        case "dir": break;
        case "file": break;
        case "simplegroup":
            process_simpleGroup(obj)
            break;
        case "proofofservice": break;
        case "snservice": break;
        case "flowservice": break;
        case "metatx": break;
        case "minergroup": break;
        case "tx": break;
        case "block": break;

        case "zone": break;
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