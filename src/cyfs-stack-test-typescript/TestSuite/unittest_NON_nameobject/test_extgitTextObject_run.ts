import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder, DeleteDescFile } from './index';
import {GitTextObject, GitTextObjectDecoder} from '../../common/types/text'
var assert = require("assert");


//GitTextObject扩展对象测试
describe("测试GitTextObject对象编解码", async function () {

    let objectstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let owner = cyfs.ObjectId.from_base_58(objectstr).unwrap()
    let decstr = "9tGpLNnX15t9qjxyAsABtdfEFUMLLHtA9iWtfVJN2BqR"
    let dec_id = cyfs.ObjectId.from_base_58(decstr).unwrap()
    let id:string = "gittext001"
    let header:string = "token:9tGpLNnX15t9qjxyAsAB"
    let value:string = "万事如意！"

    let gto1: GitTextObject
    let gto2: GitTextObject
    let gto3: GitTextObject
    let gto4: GitTextObject
  

   

    describe("编码", function () {

        it("Ts编码：正常传入有效参数创建GitTextObject对象", function () {
            gto1 = GitTextObject.create(owner,dec_id,id,header,value)
          
            let gtoid = gto1.id
            let gtoheader = gto1.header
            let gtovalue = gto1.value

            console.info(gto1)
            console.info(gtoid)
            console.info(gtoheader)
            console.info(gtovalue)
            assert.equal(id,gtoid,"断言失败，id不一致")
            assert.equal(header,gtoheader,"断言失败，header不一致")
            assert.equal(value,gtovalue,"断言失败，value不一致")
        });

        it("Ts编码：传入id参数为空值时创建GitTextObject对象", function () {
            
            gto2 = GitTextObject.create(owner,dec_id,"",header,value)
          
            let gtoid = gto2.id
            let gtoheader = gto2.header
            let gtovalue = gto2.value

            console.info(gto2)
            console.info(gtoid)
            console.info(gtoheader)
            console.info(gtovalue)
            assert.equal("",gtoid,"断言失败，id不一致")
            assert.equal(header,gtoheader,"断言失败，header不一致")
            assert.equal(value,gtovalue,"断言失败，value不一致")
        });

        it("Ts编码：传入header参数为空值时创建GitTextObject对象", function () {
            
            gto3 = GitTextObject.create(owner,dec_id,id,"",value)
          
            let gtoid = gto3.id
            let gtoheader = gto3.header
            let gtovalue = gto3.value

            console.info(gto3)
            console.info(gtoid)
            console.info(gtoheader)
            console.info(gtovalue)
            assert.equal(id,gtoid,"断言失败，id不一致")
            assert.equal("",gtoheader,"断言失败，header不一致")
            assert.equal(value,gtovalue,"断言失败，value不一致")
        });

        
        it("Ts编码：传入value参数为空值时创建GitTextObject对象", function () {
            
            gto4 = GitTextObject.create(owner,dec_id,id,header,"")
          
            let gtoid = gto4.id
            let gtoheader = gto4.header
            let gtovalue = gto4.value

            console.info(gto4)
            console.info(gtoid)
            console.info(gtoheader)
            console.info(gtovalue)
            assert.equal(id,gtoid,"断言失败，id不一致")
            assert.equal(header,gtoheader,"断言失败，header不一致")
            assert.equal("",gtovalue,"断言失败，value不一致")
        });
    })


    describe("解码", function () {

        it("Ts解码：正常传入有效参数创建GitTextObject对象", function () {
            let ugto = cyfs.to_vec(gto1).unwrap()
            let [degto,u] = new GitTextObjectDecoder().raw_decode(ugto).unwrap()
          
            let gtoid = degto.id
            let gtoheader = degto.header
            let gtovalue = degto.value

            console.info(gtoid)
            console.info(gtoheader)
            console.info(gtovalue)
            assert.equal(id,gtoid,"断言失败，id不一致")
            assert.equal(header,gtoheader,"断言失败，header不一致")
            assert.equal(value,gtovalue,"断言失败，value不一致")
        });

        it("Ts解码：传入id参数为空值时创建GitTextObject对象", function () {
            let ugto = cyfs.to_vec(gto2).unwrap()
            let [degto,u] = new GitTextObjectDecoder().raw_decode(ugto).unwrap()
          
            let gtoid = degto.id
            let gtoheader = degto.header
            let gtovalue = degto.value

            console.info(gtoid)
            console.info(gtoheader)
            console.info(gtovalue)
            assert.equal("",gtoid,"断言失败，id不一致")
            assert.equal(header,gtoheader,"断言失败，header不一致")
            assert.equal(value,gtovalue,"断言失败，value不一致")
        });
        it("Ts解码：传入header参数为空值时创建GitTextObject对象", function () {
            let ugto = cyfs.to_vec(gto3).unwrap()
            let [degto,u] = new GitTextObjectDecoder().raw_decode(ugto).unwrap()
          
            let gtoid = degto.id
            let gtoheader = degto.header
            let gtovalue = degto.value

            console.info(gtoid)
            console.info(gtoheader)
            console.info(gtovalue)
            assert.equal(id,gtoid,"断言失败，id不一致")
            assert.equal("",gtoheader,"断言失败，header不一致")
            assert.equal(value,gtovalue,"断言失败，value不一致")
        });

        it("Ts解码：传入value参数为空值时创建GitTextObject对象", function () {
            let ugto = cyfs.to_vec(gto4).unwrap()
            let [degto,u] = new GitTextObjectDecoder().raw_decode(ugto).unwrap()
          
            let gtoid = degto.id
            let gtoheader = degto.header
            let gtovalue = degto.value

            console.info(gtoid)
            console.info(gtoheader)
            console.info(gtovalue)
            assert.equal(id,gtoid,"断言失败，id不一致")
            assert.equal(header,gtoheader,"断言失败，header不一致")
            assert.equal("",gtovalue,"断言失败，value不一致")
        });
        
    })
   
})