import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, run, decoder, DeleteDescFile } from './index';
import { copySync } from "fs-extra";
var assert = require("assert");


//People对象测试
describe("测试People对象编解码", function () {
    this.timeout(0);
    describe("Ts编解码", function () {
        it("Ts编码: 有效传入owner,ood_list,public,area,name,icon参数", async function () {

            //定义创建对象需要的参数
            let name = "TEST123456!@#$%^";
            let owner = cyfs.ObjectId.from_base_58('5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC').unwrap();
            let deviceid = cyfs.DeviceId.from_base_58('5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ').unwrap();
            let ood_list1 = [deviceid]
            let area = new cyfs.Area(1, 2, 3, 4);
            let fileid = cyfs.FileId.from_base_58('7Tk94YfZjQQETp7wnMZPg9CiqZWNDwSTAxnXfCAG62Vu').unwrap()

            let icon = fileid

            let temp_path = cyfs.get_temp_path();
            let private_path = temp_path + "people.sec";
            if (!fs.existsSync(private_path)) {
                let secret = cyfs.PrivateKey.generate_rsa(2048).unwrap();
                let s = secret.to_vec().unwrap();
                fs.writeFileSync(private_path, s);
            }

            let [secret] = new cyfs.PrivatekeyDecoder().raw_decode(new Uint8Array(fs.readFileSync(private_path))).unwrap();


            //定义文件路径：
            let filepath = temp_path + 'people.obj';

            let people = cyfs.People.create(
                cyfs.Some(owner),
                ood_list1,
                secret.public(),
                cyfs.Some(area),
                name,
                icon,
            )

            let p = people.to_vec().unwrap()

            let people_id = people.desc().calculate_id();

            let [p1, _] = new cyfs.PeopleDecoder().raw_decode(p).unwrap();

            let p1_ood_list = p1.body_expect().content().ood_list

            //属性校验
            assert(p1.desc().owner()?.unwrap()?.equals(owner), 'owner属性不相等');
            assert(p1.desc().calculate_id().equals(people_id), 'PeopleId属性不相等');
            assert(p1.icon()?.equals(icon), 'icon属性不相等');
            assert.equal(name,  p1.name());
            for (let i in p1_ood_list) {
                assert(p1_ood_list[i].equals(ood_list1[i]), 'ood_list属性不相等')
            }

            fs.writeFileSync(filepath, p);
        });

    });
})