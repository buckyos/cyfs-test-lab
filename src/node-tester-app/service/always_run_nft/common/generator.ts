import assert = require('assert'); 
import * as cyfs from '../cyfs';

import * as fs from "fs-extra";
import * as path from "path";

import  sharp  from "sharp";
export function create_people(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
}


export const IMGURL = [
    /*"https://api.isoyu.com/mm_images.php",
    "https://api.isoyu.com/beibei_images.php",
    "https://api.ixiaowai.cn/api/api.php",*/
    'https://img.paulzzh.tech/touhou/random',
    "https://api.ixiaowai.cn/gqapi/gqapi.php",
    "https://api.ixiaowai.cn/mcapi/mcapi.php",
    "https://acg.toubiec.cn/random.php",
    "https://www.dmoe.cc/random.php",
    "https://unsplash.it/1600/900?random",
    "https://source.unsplash.com/user/erondu/1600x900",
    "https://unsplash.it/1600/900?random",
     "https://picsum.photos/1600/900"

]

async function cropImage(source:string,target:string) {
    let width = RandomGenerator.integer(1200,600);
    let height = RandomGenerator.integer(1200,600);
    try {
        await sharp(source)
          .resize({
            width: width,
            height: height
          })
          .toFile(target);
      } catch (error) {
        console.log(error);
      }
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
    static async img(img_path:string,name:string) {
        if(!fs.pathExistsSync(img_path)){
            fs.mkdirpSync(img_path);
        }
        img_path = path.join(img_path,name)
        return new Promise(async (V) => {
            let url:string = IMGURL[RandomGenerator.integer(IMGURL.length-1)]
            var request = require("request");
            let stream = fs.createWriteStream(img_path);
            request(url).pipe(stream).on("close", function (err:any) {
                console.log(`文件下载完毕:${path}`);
                V(img_path)
            });
            })
        
    }
    static async createImg(img_path:string,name:string) {
        // 获取一张图片
        let rand_str = RandomGenerator.string(10)+".jpg"
        await RandomGenerator.img(img_path,rand_str);  
        //await RandomGenerator.img(img_path,name);
        // 修改图片
        let source = path.join(img_path,rand_str);
        let target = path.join(img_path,name);
        await cropImage(source,target)
        //删除原始图片
        fs.rmSync(source);
        await cyfs.sleep(20000)
    }
};

