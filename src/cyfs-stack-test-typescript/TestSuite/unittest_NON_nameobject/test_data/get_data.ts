
import * as cyfs from "../../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs-extra';
const crypto = require("crypto")
import { RandomGenerator } from "../../../common";
import { dir } from "console";



//读取json 测试数据
export function get_path() {
    let allfile: string[] = []
    let object_path = path.join(__dirname)
    let allpath = fs.readdirSync(object_path)

    for (let file of allpath) {
        let filepath = path.join(object_path, file)
        let stats = fs.statSync(filepath)
        if (stats.isDirectory()) {
            let file = fs.readdirSync(filepath)
            for (let f of file) {
                let filename = f;
                let fileinner = path.join(filepath, filename)
                allfile!.push(fileinner)
            }

        }
    };
    return allfile
}


// if (fs.existsSync('app/public/static/Data.json')) //判断是否存在此文件
// {
//     //读取文件内容，并转化为Json对象
//     let userBugsJson = JSON.parse(fs.readFileSync("app/public/static/Data.json", "utf8")).toString();
//     //获取Json里key为data的数据
//     const data = userBugsJson['data'];
//     return data;
// }


// let alljson = get_path()

// console.log(alljson)
// let obj = JSON.parse(fs.readFileSync('D:\\CYFShub\\cyfs-test-lab\\src\\cyfs-stack-test-typescript\\TestSuite\\unittest_NON_nameobject\\test_data\\people\\people_main.json', { encoding: 'utf-8' }));
// console.log(obj)
// let test =obj.type
// console.log(typeof(test))




// //定义创建对象传入参数
// let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
// let deviceidstr = '5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ';
// let deviceidstr2 = '5aUiNsqWyZFmJNndx5dTDaTASNJPmj8k8npCdq9z9D16';
// let fileidstr = '7Tk94YfZjQQETp7wnMZPg9CiqZWNDwSTAxnXfCAG62Vu';
// let objectstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
// let authorstr = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijk';
// let prevstr = "9tGpLNnX15t9qjxyAsABtdfEFUMLLHtA9iWtfVJN2BqR"
// let name = "TEST123456!@#$%^";
// let name_e = "";
// let name2 = "修改name！@#￥%……&*（";

// let owner = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
// let deviceid = cyfs.DeviceId.from_base_58(deviceidstr).unwrap();
// let area = new cyfs.Area(41, 53, 669, 255);
// let fileid = cyfs.FileId.from_base_58(fileidstr).unwrap()
// let public_key = cyfs.PrivateKey.generate_rsa(2048).unwrap().public();

// //变量定义：ood_list参数传入多个DeviceId
// let ood_list = (num: number) => { let arr: cyfs.DeviceId[] = new Array(num); for (let i = 0; i < num; i++) { arr[i] = deviceid } }



// let author = cyfs.Some(cyfs.ObjectId.from_str(authorstr).unwrap())

// let prev = cyfs.Some(cyfs.ObjectId.from_base_58(prevstr).unwrap())

// let oid = cyfs.ObjectId.from_base_58(prevstr).unwrap()
// let ref_o = cyfs.Some(new cyfs.Vec([new cyfs.ObjectLink(oid, new cyfs.SomeOption(oid))]))
// let publicKeystr = "/test/simpleGroup/" + "12346sdsdad132323qwe12eqw121eqwwe2wasdadd";
// let hashvalue = crypto.createHash("sha256").update(publicKeystr).digest("hex")
// let buf = new Uint8Array().fromHex(hashvalue).unwrap()
// let rsa = cyfs.Some(new cyfs.RSAPublicKey(0, buf))
// let secp = cyfs.Some(new cyfs.Secp256k1PublicKey(buf))
// let sm2 = cyfs.Some(new cyfs.SM2PublicKey(buf))


// // String size
// let fileName = RandomGenerator.string(10);
// let filePath = path.join(__dirname, "../../test_cache_file/source")
// let file = RandomGenerator.createRandomFile(filePath, fileName, 100 * 1024 * 1024);

// console.log(">>>>>>>>>>>>>>>>>>>>>>>>>" + (("dadsdadsdadasdasdadasdasda".length * 2) / 1024).toFixed(2))




function get_big_str(size: number) {
    let tmppath = path.join(cyfs.get_temp_path(), "strfile.txt");
    fs.removeSync(tmppath)
    let insertstr = ""
    let basestr = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789/测试汉字厸厶厽孓宀巛巜彳廴彡彐彳忄扌攵 氵灬 爫犭疒癶礻糹有一个菇凉他有些任性还有些嚣张/##$&@æ。？！.《》……&（)+-=/*"
    let maxnum = basestr.length
    for (let i = 0; i < 3000; i++) {
        insertstr += basestr.charAt(Math.floor(Math.random() * (maxnum - 0)) + 0);
    }
    let len = Buffer.byteLength(insertstr, 'utf-8');
    let thesize = size * 1024 * 1024
    while (thesize > len) {
        fs.appendFileSync(tmppath,insertstr, "utf-8")
        thesize = thesize - len;
    }
    let strdata = fs.readFileSync(tmppath).toString()
    return strdata
}


