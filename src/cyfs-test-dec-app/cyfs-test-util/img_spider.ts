import * as fs from "fs-extra";
import * as path from "path";



/**
 * 爬取网上的随机图片
 * 
 */

export const IMGURL = [
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


/**
 * 对图片进行裁剪
 * @param source 
 * @param target 
 */
export async function crop_image(source: string, target: string) {
    let width = 160 //RandomGenerator.integer(1200, 600);
    let height = 250 //RandomGenerator.integer(1200, 600);
    const sharp = require("sharp") ;
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

/**
 * 往磁盘中写入一张爬取的图片
 * @param img_path 
 * @param name 
 * @returns 
 */
async function img(img_path: string, name: string) {
    if (!fs.pathExistsSync(img_path)) {
        fs.mkdirpSync(img_path);
    }
    img_path = path.join(img_path, name)
    return new Promise(async (resolve) => {
        let url: string = IMGURL[0]
        console.info(url);
        var request = require("request");
        let stream = fs.createWriteStream(img_path);
        request(url).pipe(stream).on("close", function (err: any) {
            console.log(`文件下载完毕:${path}`);
            resolve(img_path)
        });
    })

}