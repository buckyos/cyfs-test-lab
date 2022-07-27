import assert = require('assert'); 
import * as cyfs from '../../cyfs';

import * as fs from "fs-extra";
import * as path from "path";


export function create_people(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
}


export const IMGURL = {
    mm : "https://api.isoyu.com/mm_images.php",
    beibei : "https://api.isoyu.com/beibei_images.php",
    katong :"https://api.ixiaowai.cn/api/api.php",
    touhou : 'https://img.paulzzh.tech/touhou/random',
    xingkong : "https://api.dongmanxingkong.com/suijitupian/acg/1080p/index.php",
    bizhi : "https://api.ixiaowai.cn/gqapi/gqapi.php",
    mc : "https://api.ixiaowai.cn/mcapi/mcapi.php",
    acg : "https://acg.toubiec.cn/random.php",
    dmoe: "https://www.dmoe.cc/random.php"



}

export class RandomGenerator {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    static CHAR_SET:string = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz'; //0123456789
    static CN_SET : string = '巴克云网络科技有限公司测试汉字厸厶厽孓宀巛巜彳廴彡彐彳忄扌攵 氵灬 爫犭疒癶礻糹纟';
    static SYMBOL : string = 'iəɔua##$&@æ。？！.《》……&（）';
    static  string(length: number = 32,cn:number = 0,symbol:number = 0) {
        let maxPos = RandomGenerator.CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        for (let i = 0; i < cn; i++) {
            result += RandomGenerator.CN_SET.charAt(RandomGenerator.integer(maxPos));
        }
        for (let i = 0; i < symbol; i++) {
            result += RandomGenerator.SYMBOL.charAt(RandomGenerator.integer(maxPos));
        }
        return result;
    };

    static integer(max: number, min: number = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
    }
    static async createRandomFile(pathDir:string,name:string,size:number) {
        if(!fs.pathExistsSync(pathDir)){
            fs.mkdirpSync(pathDir)
        }
        let file  = path.join(pathDir,name)
        const strRandom = RandomGenerator.string(1000,1000,1000);
        let len =  Buffer.byteLength(strRandom,'utf-8');
        while(size>len){
            let err = fs.appendFileSync(file,strRandom);
            size = size - len;
        }
        fs.appendFileSync(file,RandomGenerator.string(size));
        assert(fs.pathExistsSync(file),`创建文件${path} 失败`)
        
    }

    static async createRandomDir(root:string,dirNumber:number,fileNumber:number,fileSize:number,deep:number=1){
        let dirNameList =  []
        let fileNameList = []
        // 先生成文件夹列表，文件名列表
        console.info(`开始生成随机文件夹列表`)
        for(let i = 0;i < dirNumber;i++){
            dirNameList.push(RandomGenerator.string(10))
            if(!fs.pathExistsSync(path.join(root,dirNameList[i]))){
                fs.mkdirpSync(path.join(root,dirNameList[i]))
            }
        }
        console.info(`开始生成随机文件名列表`)
        for(let i = 0;i < fileNumber;i++){
            fileNameList.push(`${RandomGenerator.string(5,5,5)}.txt`)
        }
        // TODOO 文件夹深度实现
        // 生成随机文件暂时就弄一级结构
        let len = dirNameList.length
        for(let i in fileNameList){
            await this.createRandomFile(path.join(root,dirNameList[RandomGenerator.integer(len-1)]),fileNameList[i],RandomGenerator.integer(fileSize))
            await cyfs.sleep(100);
        }

        
    }



    static async img (path:string,url:string = IMGURL.dmoe ) {
        var request = require("request");
        let stream = fs.createWriteStream(path);
        request(url).pipe(stream).on("close", function (err:any) {
            console.log("文件下载完毕");
        });


    }
};

