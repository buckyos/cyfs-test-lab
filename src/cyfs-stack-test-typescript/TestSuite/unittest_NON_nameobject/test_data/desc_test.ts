import * as cyfs from '../../../cyfs_node/cyfs_node';
import * as fs from 'fs-extra'

let proc_in: boolean | undefined = undefined;
let ret = 0;

function print_usage() {
    console.log("usage: node desc_test.js [--in|--out] <json file path>")
}

function process_argv(): string | undefined {
    if (process.argv.length < 4) {
        print_usage()
    }

    if (process.argv[2] === "--in") {
        proc_in = true;
        return process.argv[3]
    } else if (process.argv[2] === "--out") {
        proc_in = false;
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
        case "hex":
            return new cyfs.PublicKeyDecoder().raw_decode(Uint8Array.prototype.fromHex(params[1]).unwrap()).unwrap()[0]
        case "file":
            return new cyfs.PublicKeyDecoder().raw_decode(new Uint8Array(fs.readFileSync(params[1]))).unwrap()[0]
        default:
            throw new Error(`invalid public key protocol ${params[0]}`)
    }
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

    // 这里是通用的，再往下加参数就行了，前边不用动

    return builder.build(constructor)
}

function output_check_err(type: string, except: string, actual: string) {
    console.error(`check ${type} failed!, except ${except}, actual ${actual}`)
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
        let e_key = public_key(except.public_key).to_hex().unwrap()
        if (!actual.desc().public_key()) {
            output_check_err("public_key", except.public_key, "undefined")
            return false;
        }
        let a_key = actual.desc().public_key()!.to_hex().unwrap()
        if (e_key !== a_key) {
            output_check_err("public_key", e_key, a_key)
            return false;
        }
    }

    return true;
}

function process_people(obj: any) {
    if (proc_in) {
        let people_r = new cyfs.PeopleDecoder().from_raw(new Uint8Array(fs.readFileSync(obj.file)))
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
                // TODO: 自己填写检测逻辑
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

            if (obj.ood_work_mode) {
                if (people.body_expect().content().ood_work_mode() !== obj.ood_work_mode) {
                    output_check_err("ood_work_mode", obj.ood_work_mode, people.body_expect().content().ood_work_mode())
                    return;
                }
            }
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
        let builder = new cyfs.PeopleBuilder(new cyfs.PeopleDescContent(), new cyfs.PeopleBodyContent(ood_list, obj.name, icon, ood_work_mode));
        let people = process_common(builder, obj, cyfs.People);

        fs.writeFileSync(obj.file, people.to_vec().unwrap());
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
        default:
            console.error(`unsupport type`, obj.type)
            break;
    }
}

main()
process.exit(ret)