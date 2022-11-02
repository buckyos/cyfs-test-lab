import assert = require('assert'); 
import * as cyfs from '../../cyfs_node/cyfs_node';
let encoding = require('encoding');
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from 'crypto';
import  sharp  from "sharp";
export function create_people(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
}

/**
 * 
    \0	Null字符（\u0000）
    \b	退格符（\u0008）
    \t	水平制表符（\u0009）
    \n	换行符（\u000A）
    \v	垂直制表符（\u000B）
    \f	换页符（\u000C）
    \r	回车符（\u000D）
    \"	双引号（\u0022）
    \'	撇号或单引号（\u0027）
    \\	反斜杠（\u005C）
    \xXX	由 2 位十六进制数值 XX 指定的 Latin-1 字符
    \uXXXX	由 4 位十六进制数值 XXXX 指定的 Unicode 字符
    \XXX	由 1~3 位八进制数值（000 到 377）指定的 Latin-1 字符，可表示 256个 字符。如 \251 表示版本符号。注意，ECMAScript 3.0 不支持，考虑到兼容性不建议使用。
    
*/

export const ESC_char = [
    {
        name : "\\0",
        char : "\0"
    },
    {
        name : "\\b",
        char : "\b"
    },
    {
        name : "\\t",
        char : "\t"
    },
    {
        name : "\\n",
        char : "\n"
    },
    {
        name : "\\v",
        char : "\v"
    },
    {
        name : "\\f",
        char : "\f"
    },
    {
        name : "\\r",
        char : "\r"
    },
    {
        name : "\\0",
        char : "\0"
    },
    {
        name : `\\"`,
        char : "\""
    },
    {
        name : "\\'",
        char : "\'"
    },
    {
        name : "\\\\",
        char : "\\"
    },
    {
        name : "\\xXX",
        char : "\x23"
    },
    {
        name : "\\uXXXX",
        char : "\u1234"
    },
    {
        name : "\\XXX",
        char : "\u1234"
    },
]
/**
     * 汉语-简体
     * 汉语-繁体
     * 英语
     * 日语
     * 法语
     * 德语
     * 俄语
     * 韩语
     * 西班牙语
     * 葡萄牙语
     * 意大利语
     * 越南语
     * 阿拉伯语
     * 印尼语
     * 泰语

*/
const cn = "基于cyfsBDT协议打造的DECApp除了与生俱来的去中心化传输快等特性外还具备数字身份数据确权变现NFT永不停服等核心功能在使用过程中你不必担心隐私泄露数据丢失大数据杀熟等问题抢先使用快人一步感受Web30价值传递的魅力";
const cn_t = "基於cyfsBDT協議打造的DECApp除了與生俱來的去中心化傳輸快等特性外還具備數字身份數據確權變現NFT永不停服等核心功能在使用過程中你不必擔心隱私泄露數據丟失大數據殺熟等問題搶先使用快人一步感受價值傳遞的魅力";
const en = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const jp = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼ ぱぴぷぺぽ";
const french = "BasésurleprotocolecyfsBDTconstruitDECApp";
const german = "DECApp, basierend auf cyfsBDT, verfügt über neben seinen uralten eigenschaften wie der notwendigkeit der centurialen übertragung Von daten, wie dem bedürfnis nach digitalen daten, unalt zu werden und im zuge seiner nutzung keine angst vor dem verlust großer datenverlust Oder dem entweichen großer daten haben muss, um eine schnelle verwendung des charismatischen kontakts Von Web30 auslösen zu können"
const hanyu = "cyfsbdt 프로토콜 기반의 decapp는 탈중심화 신속한 전송 기능 외에도 디지털 신원 데이터 확인 권리 환원 nft 무제한 복권과 같은 핵심 기능을 갖추고 있다. 사용 중 프라이버시 유출 데이터 손실 빅데이터 익싱 등 걱정 없이 빠른 사용자는 한 번에 web30의 가치를 느낄 수 있다";
const xibanyayu = "Basado en el protocolo cyfsBDT, DECApp, además de las características innatas de transferencia descentralizada rápida, también tiene la identidad digital de datos de la verdad realización NFT nunca parar de usar funciones centrales, como no tiene que preocuparse por la violación de privacidad durante el uso pérdida de datos big data matanza problemas como anticipar el uso de la persona rápida un paso para sentir el encanto de la entrega de valor Web30"
const eyu = "DECApp, построенный на протоколе cyfsfsbdt, имеет в дополнение к врожденным свойствам децентрализованной передачи данных, которые позволяют получить доступ к централизованным функциям, таким как передача NFT, которая никогда не прерывается, и вы не должны беспокоиться о Том, что в ходе использования вы не должны беспокоиться о Том, что конфиденциальность может быть раскрыта, что данные потеряны, а также о Том, что вы можете использовать очарование быстрых людей, чтобы почувствовать передачу Web30"
const putaoyayu = "DECApp construído com base no protocolo cyfsBDT, além das características de transmissão descentralizada e rápida inato, também tem o poder de precisão de dados de identidade digital para realizar NFT nunca parar de vestir e outras funções principais no processo de uso você não precisa se preocupar com vazamento de privacidade perda de dados big data matança e outros problemas antes de usar a pessoa rápida em um passo para sentir o encanto da entrega de valor Web30"
const yidaliyu = "La RFP, basata sul protocollo cyfsBDT, oltre alle caratteristiche innate come la trasmissione rapida dei dati di identificazione digitale, ha funzioni centrali come la registrazione dei dati di identificazione digitale che non sono mai in grado di arrestare"
const yuelanyu = "DECApp được xây dựng dựa trên giao thức cyfsBDT bên cạnh những đặc điểm bẩm sinh về việc truyền tải phân cấp nhanh chóng và những thứ tương tự nó cũng có những chức năng cốt lõi như xác nhận nhận dạng kỹ thuật số NFT không bao giờ ngừng sử dụng bạn không cần phải lo lắng về việc tiết lộ thông tin cá nhân mất đi dữ liệu và những vấn đề về việc sử dụng nhanh hơn để cảm nhận sự quyến rũ của việc truyền tải giá trị Web30"
const yingninyu = "DECApp, dibentuk dengan protokol cyfsBDT, dilengkapi dengan fitur inti seperti transfer decent deactive data digital yang dapat diubah secara cepat dan NFT tidak pernah gagal dalam fungsi inti ketika digunakan anda tidak perlu khawatir tentang pertanyaan seperti kebocoran data data besar yang hilang precognment anda dapat menggunakan manusia cepat satu langkah untuk merasakan daya tarik dari pengiriman nilai 30 webcam"
const alaboyu = "(Decapp)، الذي يستند إلى اتفاق CyFSBDT)، بالإضافة إلى خاصيته الطبيعية مثل سرعة النقل المركزي السريع، لديه وظيفة أساسية مثل تحويل NFT إلى الأبد، دون أن يخشى المرء أن يستخدم قبل مرور قيمة Web30 في مسائل مثل فقدان البيانات الخصوصية، أو نضوج البيانات الضخمة"
const taiyu = "นอกจากนี้ยังมีคุณสมบัติดิจิตอลที่เกิดจากข้อตกลงไซเอฟบีดีที";

export const testLanguage =[
    {
        name : "中文-简体",
        charts : cn
    },
    {
        name : "中文-繁体",
        charts : cn_t
    },
    {
        name : "英语",
        charts : en
    },
    {
        name : "日语",
        charts : jp
    },
    {
        name : "法语",
        charts : french
    },
    {
        name : "德语",
        charts : german
    },
    {
        name : "韩语",
        charts : hanyu
    },
    {
        name : "俄语",
        charts : eyu
    },
    {
        name : "西班牙语",
        charts : xibanyayu
    },
    {
        name : "葡萄牙语",
        charts : putaoyayu
    },
    {
        name : "意大利语",
        charts : yidaliyu
    },
    {
        name : "越南语",
        charts : yuelanyu
    },
    {
        name : "阿拉伯语",
        charts : alaboyu
    },
    {
        name : "印尼语",
        charts : yingninyu
    },
    {
        name : "泰语",
        charts : taiyu
    },

]

export const LANGUAGELIST = [cn,cn_t,en,jp,french,german,hanyu,xibanyayu,eyu,eyu,putaoyayu,yidaliyu,yuelanyu,yingninyu,alaboyu,taiyu]
/**
 * ASCII
 * UNICODE
 * ISO-8859-1
 * GB2312
 * GBK
 * GB18030
 * UTF-8
 * UTF-16
*/
export const encodeType = ["ASCII","UNICODE","UTF-8","UTF-16","GBK","GB18030","GB2312","ISO-8859-1"]




/**
 * 随机图片生成
 */
export const IMGURL = [
    "https://api.isoyu.com/mm_images.php",
    "https://api.isoyu.com/beibei_images.php",
    "https://api.ixiaowai.cn/api/api.php",
    'https://img.paulzzh.tech/touhou/random',
    "https://api.ixiaowai.cn/gqapi/gqapi.php",
    "https://api.ixiaowai.cn/mcapi/mcapi.php",
    "https://acg.toubiec.cn/random.php",
    "https://www.dmoe.cc/random.php",
    "https://unsplash.it/1600/900?random",
    "https://source.unsplash.com/user/erondu/1600x900",
    "https://unsplash.it/1600/900?random",

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

export function get_len_buf(len: number) {
    let basestr = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789/测试汉字厸厶厽孓宀巛巜彳廴彡彐彳忄扌攵 氵灬 爫犭疒癶礻糹有一个菇凉他有些任性还有些嚣张/##$&@æ。？！.《》……&（)+-=/*"
    const arr: number[] = []
    let maxnum = basestr.length
    for (let i = 0; i < len; i++) {
        arr.push(basestr.charCodeAt(Math.floor(Math.random() * (maxnum - 0)) + 0))
    }
    let buf = new Uint8Array(arr)
    console.log(buf.byteLength)
    // console.log(buf)
    return buf
}

export class RandomGenerator {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    static CHAR_SET:string = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789'; //0123456789
    static CN_SET : string = '巴克云网络科技有限公司测试汉字厸厶厽孓宀巛巜彳廴彡彐彳忄扌攵 氵灬 爫犭疒癶礻糹纟';
    static LANGUAGELIST = [cn,cn_t,en,jp,french,german,hanyu,xibanyayu,eyu,eyu,putaoyayu,yidaliyu,yuelanyu,yingninyu,alaboyu,taiyu]

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
        if(Buffer.byteLength(result)<length){
            let accurate_len = length - Buffer.byteLength(result);
            result += RandomGenerator.accurateString(accurate_len);
        }
        return result;
    };    
    static accurateString(length: number = 32){
        let maxPos = RandomGenerator.CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        while(Buffer.byteLength(result)<length){
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        return result;
    }
    // static ESC_char = "\0\b\t\n\v\f\r\"\'\\\x34\xfa\123\253\u3445\uabcd";
    // static ESC_char_random(length: number = 1){
        
    //     let len = RandomGenerator.ESC_char.length;
    //     let result = '';
    //     for (let i = 0; i < length; i++) {
    //         result += RandomGenerator.ESC_char.charAt(RandomGenerator.integer(len));
    //     }
    //     return result;
    // }
    // static ESC_char_list(){
    //     let len = RandomGenerator.ESC_char.length;
    //     let result = [];
    //     for (let i = 0; i < len; i++) {
    //         result.push(RandomGenerator.ESC_char.charAt(i));
    //     }
    //     return result;
    // }
    static language(length: number = 32,type:number = 2){
        let myLen = 0
        let result = ""
        while(myLen<length){
            result += LANGUAGELIST[type].charAt(RandomGenerator.integer(LANGUAGELIST[type].length));
            myLen = myLen + 1;
        }
        return result;
    }
    static unicode(length: number): string {
        return Array.from(
            { length }, () => String.fromCharCode(Math.floor(Math.random() * (65536)))
          ).join('')
    }
    
    static accii(length:number){
        return Array.from(
            { length }, () => String.fromCharCode(Math.floor(Math.random() * (255)))
          ).join('')
    }

    static encode(length:number,type:string){
        let result = String(encoding.convert(RandomGenerator.unicode(length),type)) 
        return result
    }
    
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
        return;
        
    }
    static compareFileMD5(sourcePath:string,targetPath:string){
        let fsHash1 = crypto.createHash('md5')
        let fileInfo1 = fs.readFileSync(sourcePath)
        fsHash1.update(fileInfo1)
        let sourceMD5 = fsHash1.digest('hex')
        let fsHash2 = crypto.createHash('md5')
        let fileInfo2 = fs.readFileSync(targetPath)
        fsHash2.update(fileInfo2)
        let targetMD5 = fsHash2.digest('hex')
        if(sourceMD5 === targetMD5){
            return {err:false,log:"文件MD5值相同"}
        }else{
            return {err:true,log:"文件MD5值不同，校验失败"}
        }
    }
    static async createRandomDir(root:string,dirNumber:number,fileNumber:number,fileSize:number,deep:number=1){
        let dirNameList =  [root]
        let fileNameList = []
        // 先生成文件夹列表，文件名列表
        console.info(`开始生成随机文件夹列表`)
        for(let i = 0;i < dirNumber;i++){
            dirNameList.push(path.join(root,RandomGenerator.string(10)))
            if(!fs.pathExistsSync(path.join(root,dirNameList[i]))){
                fs.mkdirpSync(path.join(root,dirNameList[i]))
            }
        }
        console.info(`开始生成随机文件名列表`)
        for(let i = 0;i < fileNumber;i++){
            fileNameList.push(`${RandomGenerator.string(10)}.txt`)
        }
        // TODOO 文件夹深度实现
        // 生成随机文件暂时就弄一级结构
        let len = dirNameList.length
        for(let i in fileNameList){
            await this.createRandomFile(dirNameList[RandomGenerator.integer(len-1)],fileNameList[i],RandomGenerator.integer(fileSize))
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

export function Uint8ArrayToString(fileData:Uint8Array){
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
      dataString += String.fromCharCode(fileData[i]);
    }
   
    return dataString
  }
  
  
export function stringToUint8Array(str:string){
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
      arr.push(str.charCodeAt(i));
    }
   
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}

