import * as cyfs from '../../cyfs';
let encoding = require('encoding');
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from 'crypto';
import * as image_generator  from "js-image-generator"
import {ErrorCode} from "../../cyfs-test-base"
import { Mutex } from 'async-mutex';
import {language_type,get_language_list} from "./char_list"



export class RandomGenerator{
    static string(length: number){
        return StringGenerator.generate_string(length)
    }
}


export class ImageGenerator{
    /**
     * 
     * 生成随机图片写入磁盘
     * @param save_dir 
     * @param img_name 
     * @param width 
     * @param height 
     * @param quality 
     * @returns 
     */
    static async random_img(save_dir: string,img_name:string,width: number=800, height: number=600, quality: number=80):Promise<number>{
        return new Promise(async(resolver)=>{
            image_generator.generateImage(width,height,quality,function(err, image) {
                if(!fs.pathExistsSync(save_dir)){
                    fs.mkdirpSync(save_dir)
                }
                fs.writeFileSync(path.join(save_dir,img_name),image.data);
                resolver(image.data_size)
            })
        })
    }
    /**
     * 
     * 在内存中生成随机图片
     * @param width 
     * @param height 
     * @param quality 
     * @returns 
     */
    static async random_img_buffer(width: number=800, height: number=600, quality: number=80):Promise<Buffer>{
        return new Promise(async(resolver)=>{
            image_generator.generateImage(width,height,quality,function(err, image) {
                resolver(image.data)
            })
        })
    }
    /**
     * 
     * 对图片大小进行裁剪
     * @param source 
     * @param target 
     * @param width 
     * @param height 
     * @returns 
     */
    static async crop_image(source: string, target: string,width:number = 160,height:number= 250) {
        const sharp = require("sharp") ;
        if(!fs.pathExistsSync(source)){
            return{err:ErrorCode.notExist,msg:`${source} notExist`}
        }
        await sharp(source)
            .resize({
                width: width,
                height: height
            })
            .toFile(target);
        return{err:ErrorCode.succ,msg:`success`}
    }
}
export class StringGenerator{
    static generate_string(length: number): string {
        const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength: number = characters.length;
        let result: string = '';
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
    static generate_language_string(length: number = 32, type: language_type) {
        let myLen = 0
        let result = ""
        let random_source =  get_language_list(type)
        while (myLen < length) {
            result += random_source.charAt(NumberGenerator.generate_int(0,random_source.length));
            myLen = myLen + 1;
        }
        return result;
    }
    static unicode(length: number): string {
        return Array.from(
            { length }, () => String.fromCharCode(Math.floor(Math.random() * (65536)))
        ).join('')
    }

    static accii(length: number) {
        return Array.from(
            { length }, () => String.fromCharCode(Math.floor(Math.random() * (255)))
        ).join('')
    }

    static encode(length: number, type: string) {
        let result = String(encoding.convert(StringGenerator.unicode(length), type))
        return result
    }
}

export class NumberGenerator{
    // 生成指定范围的整数
    static generate_int(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 生成指定范围的浮点数
    static generate_float(min: number, max: number, precision: number = 2): number {
        const random = Math.random() * (max - min) + min;
        return parseFloat(random.toFixed(precision));
    }
}

export class BufferGenerator {
    /**
     * 生成算法：
     * 使用两个大素数 1048573 10000019生成1MB 10MB 大小cache cache_1mb cache_10mb;
     * 初始化init cache_1mb 所有数据随机
     * refresh_1mb ： 将cache_1mb 中每100字节数据刷新一次
     * refresh_10mb : refresh_1mb刷新cache_1mb，cache_10mb 用重复cache_1mb拼接
     * generate_buffer 大于10MB 部分用  cache_10mb 拼接 ，剩余用 cache_1mb 拼接，基本上测试过程不存在随机碰撞可能
     * 性能：开发机36s 生成100*200MB 数据
     */
    public static cache_1mb?: Buffer ; // 存储接近 1MB 的随机 Buffer 1048573
    public static cache_10mb?: Buffer ; // 存储接近 10MB 的随机 Buffer 10000019
    private static mutex: Mutex = new Mutex(); // 创建互斥锁
    /**
     * 生成随机buffer
     */
    private static async init(){
        BufferGenerator.cache_1mb = Buffer.alloc(1048573);
        BufferGenerator.cache_10mb = Buffer.alloc(10000019);
        for (let i = 0; i < 1048573; i++) {
            BufferGenerator.cache_1mb![i] = Math.floor(Math.random() * 256); // 遍历随机数组，将每个 1% 区间内对应位置的值设置为一个随机整数
        }
    }
    
    private static async refresh_1mb(){
        const interval: number = Math.floor(1048573 / 100); // 计算每个 1% 区间的长度
        const mod = NumberGenerator.generate_int(1,99);
        for (let i = 0; i < interval; i++) {
            BufferGenerator.cache_1mb![i*100+i%mod] = Math.floor(Math.random() * 256); // 遍历随机数组，将每个 1% 区间内对应位置的值设置为一个随机整数
        }
    }
    private static async refresh_10mb(){
        BufferGenerator.refresh_1mb();
        const cache_10mb_length: number = BufferGenerator.cache_10mb!.length;
        const cache_1mb_length: number = BufferGenerator.cache_1mb!.length;
        let offset: number = 0;
        while (offset < cache_10mb_length) {
            const remaining: number = cache_10mb_length - offset;
            const toCopy: number = Math.min(cache_1mb_length, remaining); // 计算需要复制的字节数，取 cache_1mb 和剩余空间中较小的那个
            BufferGenerator.cache_1mb!.copy(BufferGenerator.cache_10mb!, offset, 0, toCopy); // 使用 copy 方法将 cache_1mb 的内容复制到 cache_10mb 中
            offset += toCopy;
        }

    }
    /**
     * 随机buffer 
     * @param length 
     * @returns 
     */
    static async generate_buffer(length: number):Promise<{buffer:Buffer,size:number}>{
        const release = await BufferGenerator.mutex.acquire(); // 获取互斥锁
        if(!BufferGenerator.cache_10mb || !BufferGenerator.cache_1mb){
            await BufferGenerator.init();
        }
        const rand_buffer = Buffer.alloc(length);
        let offset: number = 0;
        await BufferGenerator.refresh_10mb();
        while(length - offset>10000019){
            const remaining: number = length - offset;
            const toCopy: number = Math.min(10000019, remaining); // 计算需要复制的字节数，取 cache_1mb 和剩余空间中较小的那个
            BufferGenerator.cache_10mb!.copy(rand_buffer, offset, 0, toCopy); // 使用 copy 方法将 cache_1mb 的内容复制到 cache_10mb 中
            offset += toCopy;
        }
        await BufferGenerator.refresh_1mb();
        while(length>offset){
            const remaining: number = length - offset;
            const toCopy: number = Math.min(1048573, remaining); // 计算需要复制的字节数，取 cache_1mb 和剩余空间中较小的那个
            BufferGenerator.cache_1mb!.copy(rand_buffer, offset, 0, toCopy); // 使用 copy 方法将 cache_1mb 的内容复制到 cache_10mb 中
            offset += toCopy;
        }
        release(); // 释放互斥锁
        return{buffer:rand_buffer,size:offset}
    }
    /**
     * 计算buffer 的md5
     * @param file_data 
     * @returns 
     */
    static async calculate_buffer_md5(file_data: Buffer): Promise<string> {
        let fsHash = crypto.createHash('md5')
        fsHash.update(file_data)
        let md5 = fsHash.digest('hex')
        return md5
    }

}

export class FileGenerator{
    /**
     * 内存中生成一个CYFS chunk
     * @param chunk_size 
     * @returns 
     */
    static async rand_cyfs_chunk_memory(chunk_size: number): Promise<{ err: ErrorCode, chunk_id: cyfs.ChunkId, chunk_data: Uint8Array }> {
        let chunk_data = (await BufferGenerator.generate_buffer(chunk_size)).buffer;
        let chunk_calculate = cyfs.ChunkId.calculate(chunk_data);
        return { err: ErrorCode.succ, chunk_data, chunk_id: chunk_calculate }
    }
    /**
     * 内存中生成一个CYFS File
     * @param owner 
     * @param file_size 
     * @param chunk_size 
     * @returns 
     */
    static async rand_cyfs_file_memory(owner: cyfs.ObjectId, file_size: number, chunk_size: number): Promise<{ err: ErrorCode, file: cyfs.File, file_data: Buffer, md5: string }> {
        console.info(`rand_cyfs_file_cache in memory file_size = ${file_size}`)
        let chunk_list: Array<cyfs.ChunkId> = []
        let file_data: Buffer = Buffer.from("");
        while (file_size > chunk_size) {
            let chunk_info = await FileGenerator.rand_cyfs_chunk_memory(chunk_size);
            chunk_list.push(chunk_info.chunk_id);
            file_data = Buffer.concat([file_data, chunk_info.chunk_data]);
            file_size = file_size - chunk_size;
        }
        if (file_size > 0) {
            let chunk_info = await FileGenerator.rand_cyfs_chunk_memory(file_size);
            chunk_list.push(chunk_info.chunk_id);
            file_data = Buffer.concat([file_data, chunk_info.chunk_data]);
        }
        let hash_value = cyfs.HashValue.hash_data(file_data);
        let chunkList = new cyfs.ChunkList(chunk_list);
        let file = cyfs.File.create(owner, cyfs.JSBI.BigInt(file_size), hash_value, chunkList)
        let fsHash = crypto.createHash('md5')
        fsHash.update(file_data)
        let md5 = fsHash.digest('hex')
        return { err: ErrorCode.succ, file, file_data, md5 }
    }
    /**
     * 对比磁盘中两个文件的md5
     * @param source_path 
     * @param target_path 
     * @returns 
     */
    static compare_file_md5(source_path: string, target_path: string) {
        let fsHash1 = crypto.createHash('md5')
        let fileInfo1 = fs.readFileSync(source_path)
        fsHash1.update(fileInfo1)
        let sourceMD5 = fsHash1.digest('hex')
        let fsHash2 = crypto.createHash('md5')
        let fileInfo2 = fs.readFileSync(target_path)
        fsHash2.update(fileInfo2)
        let targetMD5 = fsHash2.digest('hex')
        if (sourceMD5 === targetMD5) {
            return { err: false, log: `file md5 is ${sourceMD5}` }
        } else {
            return { err: true, log: `file md5 is different ${sourceMD5} != ${targetMD5}` }
        }

    }
    /**
     * 计算磁盘文件MD5
     * @param source_path 
     * @returns 
     */
    static calculate_file_md5(source_path: string,){
        let fsHash1 = crypto.createHash('md5')
        let fileInfo1 = fs.readFileSync(source_path)
        fsHash1.update(fileInfo1)
        let sourceMD5 = fsHash1.digest('hex')
        return sourceMD5
    }
    static async create_random_file(path_dir: string, name: string, size: number) {
        if (!fs.pathExistsSync(path_dir)) {
            fs.mkdirpSync(path_dir)
        }
        let file_path = path.join(path_dir, name)
        const str_random = (await BufferGenerator.generate_buffer(10000019)).buffer;
        let len = Buffer.byteLength(str_random, 'utf-8');
        while (size > len) {
            let err = fs.appendFileSync(file_path, str_random);
            size = size - len;
        }
        fs.appendFileSync(file_path, (await BufferGenerator.generate_buffer(size)).buffer);
        return;

    }
}
