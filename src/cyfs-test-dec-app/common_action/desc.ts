import path from "path";
import * as fs from 'fs-extra';
import * as cyfs from '../cyfs';
import JSBI from 'jsbi';
import { Command } from "commander";
import fetch from 'node-fetch'



function create_people(mnemonic: string): [cyfs.People, cyfs.PrivateKey] {
    const gen = cyfs.CyfsSeedKeyBip.from_mnemonic(mnemonic).unwrap();

    const bip_path = cyfs.CyfsChainBipPath.new_people(
        cyfs.get_current_network(),
        0);
    const pk = gen.sub_key(bip_path).unwrap();

    const people = cyfs.People.create(undefined, [], pk.public(), cyfs.Area.from_str("00:00:0000:00").unwrap(), undefined, undefined, (build) => {
        build.no_create_time()
    });

    return [people, pk]
}

// 计算哈希
function _hashCode(strValue: string): number {
    let hash = 0;
    for (let i = 0; i < strValue.length; i++) {
        const chr = strValue.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }

    hash = Math.floor(Math.abs(hash) / 63336);

    return hash;
}

// 通过uniqueStr计算当前device索引
function _calcIndex(uniqueStr: string): number {

    // 示例用了cyfs sdk依赖的node-forge库进行计算
    const md5 = cyfs.forge.md.md5.create();
    md5.update(uniqueStr, 'utf8')
    const result = cyfs.forge.util.binary.hex.encode(md5.digest())
    const index = _hashCode(result);

    console.log(`calc init index: uniqueStr=${uniqueStr}, index=${index}`);

    return index
}

function create_device(owner: cyfs.ObjectId, pk: cyfs.PrivateKey, category: cyfs.DeviceCategory, unique_id: string, nick_name?: string): [cyfs.Device, cyfs.PrivateKey, number] {
    const gen = cyfs.CyfsSeedKeyBip.from_private_key(pk.to_vec().unwrap().toHex(), owner.to_base_58());
    const address_index = _calcIndex(unique_id)
    const path = cyfs.CyfsChainBipPath.new_device(
        0,
        cyfs.get_current_network(),
        address_index
    );
    const private_key = gen.unwrap().sub_key(path).unwrap();

    const unique = cyfs.UniqueId.copy_from_slice(cyfs.forge.util.binary.raw.decode(unique_id));
    console.info(`unique_str: ${unique_id} -> ${unique.as_slice().toHex()}`);

    const device = cyfs.Device.create(
        owner,
        unique,
        [],
        [],
        [],
        private_key.public(),
        cyfs.Area.from_str("00:00:0000:00").unwrap(),
        category,
        (builder) => {
            builder.no_create_time();
        }
    );

    if (nick_name) {
        device.set_name(nick_name);
    }


    return [device, private_key, address_index]
}

function check_desc_file(desc_path: string) {
    if (fs.existsSync(desc_path)) {
        console.error(`he identity profile already exists in ${path.dirname(desc_path)}`);
        console.error(`  * If you need to overwrite please delete manually, pay attention to backup!`);
        console.error(`  * Or specify another save location with the option -s <save_path>!`);
        process.exit(0);
    }
}

async function check_people_on_meta(meta_client: cyfs.MetaClient, people_id: cyfs.ObjectId): Promise<[cyfs.People | undefined, boolean]> {
    let people: cyfs.People | undefined = undefined, is_bind = false
    const people_r = await meta_client.getDesc(people_id);
    if (people_r.ok) {
        people_r.unwrap().match({
            People: (p) => {
                is_bind = p.body_expect().content().ood_list.length > 0;
                people = p;
            }
        })
    }

    return [people, is_bind]
}

export async function run(option: {
    mnemonic?:string,
    onlyRuntime?:string,
    activate?:string,
    onlyOod?:string,
    save :string,
}) {
    let mnemonic;
    if (option.mnemonic) {
        if (!cyfs.bip39.validateMnemonic(option.mnemonic, cyfs.bip39.wordlists.english)) {
            console.error(`invalid mnemonic:`, option.mnemonic)
            return;
        }

        mnemonic = option.mnemonic;
    } else {
        mnemonic = cyfs.bip39.generateMnemonic(128, undefined, cyfs.bip39.wordlists.english);
    }

    console.log('generateing people keypair...')
    let [people, people_pk] = create_people(mnemonic);
    const people_id = people.calculate_id()
    console.log('generated people id:', people_id.to_base_58())

    const meta_client = cyfs.create_meta_client();
    const [meta_people, is_bind] = await check_people_on_meta(meta_client, people_id)

    if (meta_people) {
        people = meta_people
    }

    {
        const workspace = option.save;
        fs.ensureDirSync(workspace);

        let people_desc_path, people_sec_path, ood_desc_path, ood_sec_path,standby_ood_desc_path,standby_ood_sec_path
        let runtime_desc_path1, runtime_sec_path1, runtime_desc_path2, runtime_sec_path2
        if (!option.onlyRuntime) {
            // 检查链上有没有People信息，是否已绑定
            const meta_client = cyfs.create_meta_client();
            const [meta_people, is_bind] = await check_people_on_meta(meta_client, people_id)

            if (meta_people) {
                people = meta_people
            }

            if (!is_bind) {
                console.log('generateing ood keypair...')
                let unique_id = Date.now().toString()+"ood";
                const [ood, ood_pk] = create_device(people_id, people_pk, cyfs.DeviceCategory.OOD, unique_id);
                unique_id = Date.now().toString()+"standby_ood";
                const [standby_ood, standby_ood_pk] = create_device(people_id, people_pk, cyfs.DeviceCategory.OOD, unique_id);
                // 设置People的ood_list
                people.body_expect().content().ood_list.push(ood.device_id());
                people.body_expect().content().ood_list.push(standby_ood.device_id());
                people.body_expect().increase_update_time(cyfs.bucky_time_now());

                console.log('set ood info to people desc')
                // People给ood签名
                cyfs.sign_and_push_named_object(people_pk, ood, new cyfs.SignatureRefIndex(254)).unwrap();
                cyfs.sign_and_push_named_object(people_pk, standby_ood, new cyfs.SignatureRefIndex(254)).unwrap();
                // People给自己签名
                cyfs.sign_and_push_named_object(people_pk, people, new cyfs.SignatureRefIndex(255)).unwrap();

                console.log('put people and ood desc to meta chain')

                // People上链
                if (meta_people) {
                    await meta_client.update_desc(people, cyfs.SavedMetaObject.try_from(people).unwrap(), undefined, undefined, people_pk);
                } else {
                    await meta_client.create_desc(people, cyfs.SavedMetaObject.try_from(people).unwrap(), JSBI.BigInt(0), 0, 0, people_pk);
                }

                // OOD 上链
                await meta_client.create_desc(ood, cyfs.SavedMetaObject.try_from(ood).unwrap(), JSBI.BigInt(0), 0, 0, ood_pk);
                await meta_client.create_desc(standby_ood, cyfs.SavedMetaObject.try_from(standby_ood).unwrap(), JSBI.BigInt(0), 0, 0, standby_ood_pk);

                people_desc_path = path.join(workspace, 'people.desc');
                people_sec_path = path.join(workspace, 'people.sec');

                ood_desc_path = path.join(workspace, 'ood.desc');
                ood_sec_path = path.join(workspace, 'ood.sec');

                standby_ood_desc_path = path.join(workspace, 'ood_standby.desc');
                standby_ood_sec_path = path.join(workspace, 'ood_standby.sec');

                check_desc_file(people_desc_path)
                check_desc_file(ood_desc_path)

                // People写入文件
                fs.writeFileSync(people_desc_path, people.to_vec().unwrap());
                fs.writeFileSync(people_sec_path, people_pk.to_vec().unwrap());

                // ood写入文件
                fs.writeFileSync(ood_desc_path, ood.to_vec().unwrap());
                fs.writeFileSync(ood_sec_path, ood_pk.to_vec().unwrap());
                // ood写入文件
                fs.writeFileSync(standby_ood_desc_path, standby_ood.to_vec().unwrap());
                fs.writeFileSync(standby_ood_sec_path, standby_ood_pk.to_vec().unwrap());
            }

        }
      
        if (!option.onlyOod) {
            console.log('generateing runtime keypair...')
            const unique_id = Date.now().toString() + "runtime1";
            const [runtime, runtime_pk] = create_device(people_id, people_pk, cyfs.DeviceCategory.PC, unique_id);

            // People给runtime签名
            cyfs.sign_and_push_named_object(people_pk, runtime, new cyfs.SignatureRefIndex(254)).unwrap();

            runtime_desc_path1 = path.join(workspace, 'runtime1.desc');
            runtime_sec_path1 = path.join(workspace, 'runtime1.sec');

            // runtime写入文件
            fs.writeFileSync(runtime_desc_path1, runtime.to_vec().unwrap());
            fs.writeFileSync(runtime_sec_path1, runtime_pk.to_vec().unwrap());
        }
        if (!option.onlyOod) {
            console.log('generateing runtime keypair...')
            const unique_id = Date.now().toString() + "runtime2";
            const [runtime, runtime_pk] = create_device(people_id, people_pk, cyfs.DeviceCategory.PC, unique_id);

            // People给runtime签名
            cyfs.sign_and_push_named_object(people_pk, runtime, new cyfs.SignatureRefIndex(254)).unwrap();

            runtime_desc_path2 = path.join(workspace, 'runtime2.desc');
            runtime_sec_path2 = path.join(workspace, 'runtime2.sec');

            // runtime写入文件
            fs.writeFileSync(runtime_desc_path2, runtime.to_vec().unwrap());
            fs.writeFileSync(runtime_sec_path2, runtime_pk.to_vec().unwrap());
        }
        console.log("");
        console.log("");
        console.log("===============");
        console.log("A unique CYFS identity file has been generated for you, please keep it safe and use it according to the tutorial.");
        console.log(`Output Directory:  ${workspace} `);
        console.log("===============");
        if (people_desc_path) {
            console.log("*people Identity file:");
            console.log(`    * ${people_desc_path}`);
            console.log(`    * ${people_sec_path}`);
        }
        if (runtime_desc_path1) {
            console.log("*cyfs-runtime1 Identity file:");
            console.log(`    * ${runtime_desc_path1}`);
            console.log(`    * ${runtime_sec_path1}`);
        }
        if (runtime_desc_path2) {
            console.log("*cyfs-runtime2 Identity file:");
            console.log(`    * ${runtime_desc_path2}`);
            console.log(`    * ${runtime_sec_path2}`);
        }
        if (ood_desc_path) {
            console.log("*cyfs-ood Identity file:");
            console.log(`    * ${ood_desc_path}`);
            console.log(`    * ${ood_sec_path}`);
        }
        if (standby_ood_desc_path) {
            console.log("*cyfs-standby-ood Identity file:");
            console.log(`    * ${standby_ood_desc_path}`);
            console.log(`    * ${standby_ood_sec_path}`);
        }
        console.log("===============");
        console.log("Mnemonic：", mnemonic);
        let mnemonic_paht = path.join(workspace, 'mnemonic');
        fs.writeFileSync(mnemonic_paht, mnemonic);
        console.log("Please keep the mnemonic in a safe place, it can be imported into CyberChat for management")


    }
}