import assert  from 'assert'; 
import * as cyfs from '../../cyfs';




export function create_people(): [cyfs.People, cyfs.PrivateKey] {
    let pk = cyfs.PrivateKey.generate_rsa(1024).unwrap();
    let public_key = pk.public();
    let people = cyfs.People.create(cyfs.None, [], public_key, cyfs.None);
    return [people, pk];
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
};

