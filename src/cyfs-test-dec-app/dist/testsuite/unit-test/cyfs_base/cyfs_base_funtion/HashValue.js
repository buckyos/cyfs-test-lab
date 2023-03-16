"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const cyfs = __importStar(require("../../../../cyfs"));
const common_1 = require("../../../../common");
const path = require("path");
const fs = __importStar(require("fs-extra"));
const cry = __importStar(require("crypto"));
describe("SharedCyfsStack crypto目录", function () {
    this.timeout(0);
    describe("HashValue 测试", async () => {
        it("hash_value比较计算正确性", async () => {
            let packagevaluestr = "/test/contract/" + "12346sdsdad132323qwe12eqw121eqwwe2wasdadd";
            let buf = new Uint8Array().fromHex(packagevaluestr).unwrap();
            //使用第三方库获得一串hash，字符串类型
            let sha256value = cry.createHash("sha256").update(buf).digest("hex");
            //cyfs.HashValue使用同一buf创建HashValue对象
            let packagevalue = cyfs.HashValue.hash_data(buf);
            let hashValue = packagevalue.to_hex_string(); //将hashValue对象转成 hex_string类型
            //检查
            assert(sha256value === hashValue, `不匹配 buf: ${sha256value} buf2: ${hashValue}`);
            console.log(`========> ${sha256value}`);
            console.log(`========> ${hashValue}`);
        });
        it("大数据hashData测试--50Mb", async () => {
            //数据构造
            let saveDir = path.join(__dirname, "../../test_cache_file/crypto");
            let inner_path = `/file-${common_1.RandomGenerator.string(2, 2, 2)}.txt`;
            let local_path = path.join(saveDir, inner_path);
            console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`);
            { //清理缓存文件
                let num = fs.readdirSync(saveDir).length;
                if (num > 5) {
                    await fs.removeSync(saveDir);
                    console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！");
                }
            }
            //(2)生成测试文件
            await common_1.RandomGenerator.create_random_file(saveDir, inner_path, 50 * 1024 * 1024);
            let desc_buf = fs.readFileSync(local_path);
            let buf = new Uint8Array(desc_buf);
            //使用第三方库获得一串hash，字符串类型
            let sha256value = cry.createHash("sha256").update(buf).digest("hex");
            //耗时
            let hashValueTime = Date.now();
            //cyfs.HashValue使用同一buf创建HashValue对象
            let packagevalue = cyfs.HashValue.hash_data(buf);
            hashValueTime = Date.now() - hashValueTime;
            console.info(`=======> hashValue 耗时：${hashValueTime}ms`);
            let hashValue = packagevalue.to_hex_string(); //将hashValue对象转成 hex_string类型
            //检查
            assert(sha256value === hashValue, `不匹配 buf: ${sha256value} buf2: ${hashValue}`);
            console.log(`========> ${sha256value}`);
            console.log(`========> ${hashValue}`);
        });
        it("大数据hashData测试--100Mb", async () => {
            //数据构造
            let saveDir = path.join(__dirname, "../../test_cache_file/crypto");
            let inner_path = `/file-${common_1.RandomGenerator.string(2, 2, 2)}.txt`;
            let local_path = path.join(saveDir, inner_path);
            console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`);
            { //清理缓存文件
                let num = fs.readdirSync(saveDir).length;
                if (num > 5) {
                    await fs.removeSync(saveDir);
                    console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！");
                }
            }
            //(2)生成测试文件
            await common_1.RandomGenerator.create_random_file(saveDir, inner_path, 100 * 1024 * 1024);
            let desc_buf = fs.readFileSync(local_path);
            let buf = new Uint8Array(desc_buf);
            //使用第三方库获得一串hash，字符串类型
            let sha256value = cry.createHash("sha256").update(buf).digest("hex");
            //耗时
            let hashValueTime = Date.now();
            //cyfs.HashValue使用同一buf创建HashValue对象
            let packagevalue = cyfs.HashValue.hash_data(buf);
            hashValueTime = Date.now() - hashValueTime;
            console.info(`=======> hashValue 耗时：${hashValueTime}ms`);
            let hashValue = packagevalue.to_hex_string(); //将hashValue对象转成 hex_string类型
            //检查
            assert(sha256value === hashValue, `不匹配 buf: ${sha256value} buf2: ${hashValue}`);
            console.log(`========> ${sha256value}`);
            console.log(`========> ${hashValue}`);
        });
        it("大数据hashData测试--150Mb", async () => {
            //数据构造
            let saveDir = path.join(__dirname, "../../test_cache_file/crypto");
            let inner_path = `/file-${common_1.RandomGenerator.string(2, 2, 2)}.txt`;
            let local_path = path.join(saveDir, inner_path);
            console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`);
            { //清理缓存文件
                let num = fs.readdirSync(saveDir).length;
                if (num > 5) {
                    await fs.removeSync(saveDir);
                    console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！");
                }
            }
            //(2)生成测试文件
            await common_1.RandomGenerator.create_random_file(saveDir, inner_path, 150 * 1024 * 1024);
            let desc_buf = fs.readFileSync(local_path);
            let buf = new Uint8Array(desc_buf);
            //使用第三方库获得一串hash，字符串类型
            let sha256value = cry.createHash("sha256").update(buf).digest("hex");
            //耗时
            let hashValueTime = Date.now();
            //cyfs.HashValue使用同一buf创建HashValue对象
            let packagevalue = cyfs.HashValue.hash_data(buf);
            hashValueTime = Date.now() - hashValueTime;
            console.info(`=======> hashValue 耗时：${hashValueTime}ms`);
            let hashValue = packagevalue.to_hex_string(); //将hashValue对象转成 hex_string类型
            //检查
            assert(sha256value === hashValue, `不匹配 buf: ${sha256value} buf2: ${hashValue}`);
            console.log(`========> ${sha256value}`);
            console.log(`========> ${hashValue}`);
        });
        it("大数据hashData测试--200Mb", async () => {
            //数据构造
            let saveDir = path.join(__dirname, "../../test_cache_file/crypto");
            let inner_path = `/file-${common_1.RandomGenerator.string(2, 2, 2)}.txt`;
            let local_path = path.join(saveDir, inner_path);
            console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`);
            { //清理缓存文件
                let num = fs.readdirSync(saveDir).length;
                if (num > 5) {
                    await fs.removeSync(saveDir);
                    console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！");
                }
            }
            //(2)生成测试文件
            await common_1.RandomGenerator.create_random_file(saveDir, inner_path, 200 * 1024 * 1024);
            let desc_buf = fs.readFileSync(local_path);
            let buf = new Uint8Array(desc_buf);
            //使用第三方库获得一串hash，字符串类型
            let sha256value = cry.createHash("sha256").update(buf).digest("hex");
            //耗时
            let hashValueTime = Date.now();
            //cyfs.HashValue使用同一buf创建HashValue对象
            let packagevalue = cyfs.HashValue.hash_data(buf);
            hashValueTime = Date.now() - hashValueTime;
            console.info(`=======> hashValue 耗时：${hashValueTime}ms`);
            let hashValue = packagevalue.to_hex_string(); //将hashValue对象转成 hex_string类型
            //检查
            assert(sha256value === hashValue, `不匹配 buf: ${sha256value} buf2: ${hashValue}`);
            console.log(`========> ${sha256value}`);
            console.log(`========> ${hashValue}`);
        });
        it("大数据hashData测试--300Mb", async () => {
            //数据构造
            let saveDir = path.join(__dirname, "../../test_cache_file/crypto");
            let inner_path = `/file-${common_1.RandomGenerator.string(2, 2, 2)}.txt`;
            let local_path = path.join(saveDir, inner_path);
            console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`);
            { //清理缓存文件
                let num = fs.readdirSync(saveDir).length;
                if (num > 5) {
                    await fs.removeSync(saveDir);
                    console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！");
                }
            }
            //(2)生成测试文件
            await common_1.RandomGenerator.create_random_file(saveDir, inner_path, 300 * 1024 * 1024);
            let desc_buf = fs.readFileSync(local_path);
            let buf = new Uint8Array(desc_buf);
            //使用第三方库获得一串hash，字符串类型
            let sha256value = cry.createHash("sha256").update(buf).digest("hex");
            //耗时
            let hashValueTime = Date.now();
            //cyfs.HashValue使用同一buf创建HashValue对象
            let packagevalue = cyfs.HashValue.hash_data(buf);
            hashValueTime = Date.now() - hashValueTime;
            console.info(`=======> hashValue 耗时：${hashValueTime}ms`);
            let hashValue = packagevalue.to_hex_string(); //将hashValue对象转成 hex_string类型
            //检查
            assert(sha256value === hashValue, `不匹配 buf: ${sha256value} buf2: ${hashValue}`);
            console.log(`========> ${sha256value}`);
            console.log(`========> ${hashValue}`);
        });
        it("大数据hashData测试--400Mb", async () => {
            //数据构造
            let saveDir = path.join(__dirname, "../../test_cache_file/crypto");
            let inner_path = `/file-${common_1.RandomGenerator.string(2, 2, 2)}.txt`;
            let local_path = path.join(saveDir, inner_path);
            console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`);
            { //清理缓存文件
                let num = fs.readdirSync(saveDir).length;
                if (num > 5) {
                    await fs.removeSync(saveDir);
                    console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！");
                }
            }
            //(2)生成测试文件
            await common_1.RandomGenerator.create_random_file(saveDir, inner_path, 400 * 1024 * 1024);
            let desc_buf = fs.readFileSync(local_path);
            let buf = new Uint8Array(desc_buf);
            //使用第三方库获得一串hash，字符串类型
            let sha256value = cry.createHash("sha256").update(buf).digest("hex");
            //耗时
            let hashValueTime = Date.now();
            //cyfs.HashValue使用同一buf创建HashValue对象
            let packagevalue = cyfs.HashValue.hash_data(buf);
            hashValueTime = Date.now() - hashValueTime;
            console.info(`=======> hashValue 耗时：${hashValueTime}ms`);
            let hashValue = packagevalue.to_hex_string(); //将hashValue对象转成 hex_string类型
            //检查
            assert(sha256value === hashValue, `不匹配 buf: ${sha256value} buf2: ${hashValue}`);
            console.log(`========> ${sha256value}`);
            console.log(`========> ${hashValue}`);
        });
        it("大数据hashData测试--500Mb", async () => {
            //数据构造
            let saveDir = path.join(__dirname, "../../test_cache_file/crypto");
            let inner_path = `/file-${common_1.RandomGenerator.string(2, 2, 2)}.txt`;
            let local_path = path.join(saveDir, inner_path);
            console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`);
            { //清理缓存文件
                let num = fs.readdirSync(saveDir).length;
                if (num > 5) {
                    await fs.removeSync(saveDir);
                    console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！");
                }
            }
            //(2)生成测试文件
            await common_1.RandomGenerator.create_random_file(saveDir, inner_path, 500 * 1024 * 1024);
            let desc_buf = fs.readFileSync(local_path);
            let buf = new Uint8Array(desc_buf);
            //使用第三方库获得一串hash，字符串类型
            let sha256value = cry.createHash("sha256").update(buf).digest("hex");
            //耗时
            let hashValueTime = Date.now();
            //cyfs.HashValue使用同一buf创建HashValue对象
            let packagevalue = cyfs.HashValue.hash_data(buf);
            hashValueTime = Date.now() - hashValueTime;
            console.info(`=======> hashValue 耗时：${hashValueTime}ms`);
            let hashValue = packagevalue.to_hex_string(); //将hashValue对象转成 hex_string类型
            //检查
            assert(sha256value === hashValue, `不匹配 buf: ${sha256value} buf2: ${hashValue}`);
            console.log(`========> ${sha256value}`);
            console.log(`========> ${hashValue}`);
        });
    });
});
