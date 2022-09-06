import * as cyfs from '../cyfs_node/cyfs_node';

function create_people(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
}
async function main() {
    let [ower,key] = create_people()
}

main()