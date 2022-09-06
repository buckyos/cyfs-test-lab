import * as cyfs from '../cyfs_node/cyfs_node';

function create_people(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
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
}

main()