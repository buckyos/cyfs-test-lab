

 
 import * as crypto from 'crypto';
 import * as fs from "fs-extra";
 async function _md5(file_path: string) {
    try {
        let fsHash = crypto.createHash('md5')
        let fileInfo = fs.readFileSync(file_path)
        fsHash.update(fileInfo)
        let md5 = fsHash.digest('hex')
        console.info(`${file_path} md5 =${md5}`)
        return md5;
    } catch (error) {
        console.error(`md5 file err = ${JSON.stringify(error)}`);
        return JSON.stringify(error)
    }
    
}


async function main() {
    let md5_1 = await _md5("E:\\git_test\\cyfs-test-lab\\src\\cyfs-test-dec-app\\blog\\cache\\zone1_device1\\file_upload\\xXX0EppWQk.txt")
    let md5_2 = await _md5("E:\\git_test\\cyfs-test-lab\\src\\cyfs-test-dec-app\\blog\\cache\\zone1_device2\\file_download\\xXX0EppWQk.txt")
}
main(); 