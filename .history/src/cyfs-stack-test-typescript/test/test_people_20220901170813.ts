import * as cyfs from '../cyfs_node/cyfs_node';
import {RandomGenerator} from "../common/utils/generator"
function create_people(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
}
export function Uint8ArrayToString(fileData: Uint8Array) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString
}
export function stringToUint8Array(str: string) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}
async function main() {
    let [ower,key] = create_people();
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.Some(ower.calculate_id()), [], public_key, cyfs.None);
    // (1)NamedObject 基类方法
    people.calculate_id()  //NamedObject
    people.desc().obj_type_code() //NamedObjectDesc
    people.body_expect().content //ObjectMutBody
    people.signs().body_signs() //ObjectSigns
    let data = new cyfs.PeopleDecoder().raw_decode(people.to_vec().unwrap()).unwrap();  //对象编解码

    //(2) 标准对象/核心对象自带方法
    people.desc().author()
    people.body_expect().content().ood_work_mode()

    //(3) 参数边界值之类的东西
    let buf = stringToUint8Array(RandomGenerator.string(6*1024*1024))
    let unique_id : cyfs.UniqueId = new cyfs.UniqueId(buf);
    let area = new cyfs.Area(1, 2, 3, 4);
    let public_key_device = cyfs.PrivateKey.generate_rsa(2048).unwrap().public();
    let category = cyfs.DeviceCategory.OOD;
    let device = cyfs.Device.create(cyfs.Some(ower.calculate_id()),unique_id,[],[],[],public_key_device,area,category)
}

main()