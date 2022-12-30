import * as cyfs from '../../../cyfs_node';
import { MyTest, MyTestDecoder } from '../../../common/types/myTestObject'
var assert = require("assert");
const crypto = require("crypto")


//MyTest扩展对象测试
describe("测试MyTest对象编解码", async function () {

    let objectstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let authorstr = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijk';
    let owner = cyfs.ObjectId.from_base_58(objectstr).unwrap()
    let author = cyfs.ObjectId.from_str(authorstr).unwrap()
    let prevstr = "9tGpLNnX15t9qjxyAsABtdfEFUMLLHtA9iWtfVJN2BqR"
    let prev = cyfs.ObjectId.from_base_58(prevstr).unwrap()

    let oid = cyfs.ObjectId.from_base_58(prevstr).unwrap()
    let ol = new cyfs.Vec([new cyfs.ObjectLink(oid, oid)])
    let publicKeystr = "/test/simpleGroup/" + "12346sdsdad132323qwe12eqw121eqwwe2wasdadd";
    let hashvalue = crypto.createHash("sha256").update(publicKeystr).digest("hex")
    let buf = new Uint8Array().fromHex(hashvalue).unwrap()
    let rsa = new cyfs.RSAPublicKey(0, buf)
    let secp = new cyfs.Secp256k1PublicKey(buf)
    //let sm2 = cyfs.Some(new cyfs.SM2PublicKey(buf))

    let name: string = "扩展对象公匙"
    let network: string = "局域网"

    let myTest1: MyTest
    let myTest2: MyTest
    let myTest3: MyTest
    let myTest4: MyTest
    let myTest5: MyTest
    let myTest6: MyTest
    let myTest7: MyTest
   




    describe("编码", function () {
        it("Ts编码：正常传入有效参数创建MyTest对象", function () {
            myTest1 = MyTest.create(owner, author, prev, ol, rsa, name, network)

            let mtname = myTest1.body_expect().content().name
            let mtnetwork = myTest1.body_expect().content().network

            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
        it("Ts编码：传入name参数为空值创建MyTest对象", function () {
            myTest2 = MyTest.create(owner, author, prev, ol, rsa, "", network)

            let mtname = myTest2.body_expect().content().name
            let mtnetwork = myTest2.body_expect().content().network

            console.info(mtname)
            console.info(mtnetwork)

            assert.equal("", mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
        it("Ts编码：传入network参数为空值创建MyTest对象", function () {
            myTest3 = MyTest.create(owner, author, prev, ol, rsa, name, "")

            let mtname = myTest3.body_expect().content().name
            let mtnetwork = myTest3.body_expect().content().network

            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal("", mtnetwork, "断言失败，network不一致")
        });
        it("Ts编码：puclikey为secp类型创建MyTest对象", function () {
            myTest4 = MyTest.create(owner, author, prev, ol, secp, name, network)

            let mtname = myTest4.body_expect().content().name
            let mtnetwork = myTest4.body_expect().content().network

            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
        // it.skip("Ts编码：puclikey为sm2类型创建MyTest对象", function () {
        //     myTest5 = MyTest.create(owner, author, prev, ol, sm2, name, network)

        //     let mtname = myTest5.body_expect().content().name
        //     let mtnetwork = myTest5.body_expect().content().network

        //     console.info(mtname)
        //     console.info(mtnetwork)

        //     assert.equal(name, mtname, "断言失败，name不一致")
        //     assert.equal(network, mtnetwork, "断言失败，network不一致")
        // });
        it("Ts编码：puclikey为rsa类型且size为256创建MyTest对象", function () {
            let rsa2048 = new cyfs.RSAPublicKey(1, buf)
            myTest6 = MyTest.create(owner, author, prev, ol, rsa2048, name, network)

            let mtname = myTest6.body_expect().content().name
            let mtnetwork = myTest6.body_expect().content().network

            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
        it("Ts编码：puclikey为rsa类型且size为384创建MyTest对象", function () {
            let rsa3072 = new cyfs.RSAPublicKey(2, buf)
            myTest7 = MyTest.create(owner, author, prev, ol, rsa3072, name, network)

            let mtname = myTest7.body_expect().content().name
            let mtnetwork = myTest7.body_expect().content().network

            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        
        });
    });

    describe("解码", function () {

        it("Ts解码：正常传入有效参数创建MyTest对象", function () {
            let umyTest  = cyfs.to_vec(myTest1).unwrap()
            let [demyTest1,u] = new MyTestDecoder().raw_decode(umyTest).unwrap()

            let mtname = demyTest1.body_expect().content().name
            let mtnetwork = demyTest1.body_expect().content().network

            console.info(demyTest1)
            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
        it("Ts解码：传入name参数为空值创建MyTest对象", function () {
            let umyTest  = cyfs.to_vec(myTest2).unwrap()
            let [demyTest1,u] = new MyTestDecoder().raw_decode(umyTest).unwrap()

            let mtname = demyTest1.body_expect().content().name
            let mtnetwork = demyTest1.body_expect().content().network

            console.info(demyTest1)
            console.info(mtname)
            console.info(mtnetwork)

            assert.equal("", mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
        it("Ts解码：传入network参数为空值创建MyTest对象", function () {
            let umyTest  = cyfs.to_vec(myTest3).unwrap()
            let [demyTest1,u] = new MyTestDecoder().raw_decode(umyTest).unwrap()

            let mtname = demyTest1.body_expect().content().name
            let mtnetwork = demyTest1.body_expect().content().network

            console.info(demyTest1)
            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal("", mtnetwork, "断言失败，network不一致")
        });
        it("Ts解码：puclikey为secp类型创建MyTest对象", function () {
            let umyTest  = cyfs.to_vec(myTest4).unwrap()
            let [demyTest1,u] = new MyTestDecoder().raw_decode(umyTest).unwrap()

            let mtname = demyTest1.body_expect().content().name
            let mtnetwork = demyTest1.body_expect().content().network

    
            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
        // it("Ts解码：puclikey为sm2类型创建MyTest对象", function () {
        //     let umyTest  = cyfs.to_vec(myTest5).unwrap()
        //     let [demyTest1,u] = new MyTestDecoder().raw_decode(umyTest).unwrap()

        //     let mtname = demyTest1.body_expect().content().name
        //     let mtnetwork = demyTest1.body_expect().content().network

    
        //     console.info(mtname)
        //     console.info(mtnetwork)

        //     assert.equal(name, mtname, "断言失败，name不一致")
        //     assert.equal(network, mtnetwork, "断言失败，network不一致")
        // });
        it("Ts解码：puclikey为rsa类型且size为256创建MyTest对象", function () {
            let umyTest  = cyfs.to_vec(myTest6).unwrap()
            let [demyTest1,u] = new MyTestDecoder().raw_decode(umyTest).unwrap()

            let mtname = demyTest1.body_expect().content().name
            let mtnetwork = demyTest1.body_expect().content().network

    
            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
        it("Ts解码：puclikey为rsa类型且size为384创建MyTest对象", function () {
            let umyTest  = cyfs.to_vec(myTest7).unwrap()
            let [demyTest1,u] = new MyTestDecoder().raw_decode(umyTest).unwrap()

            let mtname = demyTest1.body_expect().content().name
            let mtnetwork = demyTest1.body_expect().content().network

    
            console.info(mtname)
            console.info(mtnetwork)

            assert.equal(name, mtname, "断言失败，name不一致")
            assert.equal(network, mtnetwork, "断言失败，network不一致")
        });
    })
})