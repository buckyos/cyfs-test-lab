const fs = require('fs')
const path = require('path')
const build_util = require('./build_util')
const build_config = require('./build_config')
const zipTask = require('./zipTask')
const request = require('./request')
const child_process = require('child_process');
const { info } = require('console')

// build_util.reflesh_cargo();

// 非ios: x86_64-pc-windows-msvc;x86_64-unknown-linux-gnu;aarch64-linux-android;i686-pc-windows-msvc;armv7-linux-androideabi
// ios: aarch64-apple-ios





function prepare_bash(base_path, dirs) {
    child_process.execSync(`bash -c "rm -rf ${base_path}"`);
    child_process.execSync(`bash -c "mkdir ${base_path} -p"`);
    for (const dir of dirs) {
        child_process.execSync(`bash -c "cp -r -f ${dir} ${base_path}/"`);
    }
}

function build(catalogy, need_pack, need_bin) {
    try{fs.rmSync(`dist/${catalogy}`, {recursive: true, force: true})}catch(error){}
    if (build_config[catalogy] === undefined) {
        console.error(`build catalogy ${catalogy} not exists in config`)
        return
    }
    /*
    if (process.argv[2].includes("unknown-linux")) {
        // 这里拷贝rust_src下的必要文件到bash的文件夹下
        prepare_bash("~/workspace/ffs", ["3rd", "component", "service", "tests", "tools", "Cargo.toml", "Cargo.lock"])
    }*/

    for (const prog of build_config[catalogy]) {
        console.info(prog)
        for (const target of targets) {
            console.info(target)
            let prog_name = build_util.build(prog, buildType, target, buildnumber, channel, "~/workspace/ffs")
            if (prog_name === undefined) {
                continue
            }
            let target_dir
            if (need_pack) {
                target_dir = `dist/${catalogy}/${prog.name}/${target}`
                if (need_bin) {
                    target_dir = `${target_dir}/bin`
                }
            } else {
                target_dir = `dist/${catalogy}/${target}`
            }
            if (!fs.existsSync(target_dir)) {
                fs.mkdirSync(target_dir, {recursive: true})
            }
            fs.copyFileSync(`target/${target}/${buildType}/${prog_name}`, `${target_dir}/${prog_name}`);
        }
    }
}

async function updateService(serviceid, servicename, url, mds) {
    let postData = JSON.stringify({
        "serviceid": serviceid,
        "servicename":servicename,
        "version": `${buildnumber}.01`,
        "url": url,
        "md5": mds,
        "agentscope": 2,
    });
    let resp = await request.request('POST', 'service/update', postData, request.ContentType.json);
    return resp;
}

const targets = process.argv[2].split(";")
const types = process.argv[3].split(";")
const buildnumber = process.argv[4] || "1"
const channel = process.argv[5] || "nightly"
const buildType = process.argv[6] || "release"

async function main(){
 
    if (!fs.existsSync('Cargo.toml')) {
        console.error('cannot find Cargo.toml in cwd! check working dir')
    }
    // 更新CYFS 代码
    if(channel == "nightly"){
        child_process.execSync(`..\\opt\\script\\init_git.bat main`)
    }else if (channel == "beta"){
        child_process.execSync(`..\\opt\\script\\init_git.bat beta`)
    }
    
    // 编译文件
    console.info(`###### 编译文件`)
    for (const type of types) {
        let need_pack = type === "services" || type === "apps"
        let need_bin = type === "services"
        build(type, need_pack, need_bin)
    }
    console.info("######## 打包上传")
    // 复制文件打包上传
    let serviceid = build_config.service.cyfs_bdt.serviceid;
    let servicename = build_config.service.cyfs_bdt.servicename;
    if(channel=="nightly"){
        serviceid = build_config.service.cyfs_bdt_nightly.serviceid;
        servicename = build_config.service.cyfs_bdt_nightly.servicename;
    }else if(channel=="beta"){
        serviceid = build_config.service.cyfs_bdt_beta.serviceid;
        servicename = build_config.service.cyfs_bdt_beta.servicename;
    }
    if(fs.existsSync(path.join(__dirname,"../../src/target/x86_64-pc-windows-msvc/release/bdt-tools.exe"))){
        fs.copyFileSync(path.join(__dirname,"../../src/target/x86_64-pc-windows-msvc/release/bdt-tools.exe"),path.join(__dirname,"../service/cyfs_bdt/bdt-tools.exe"))
    }
    if(fs.existsSync(path.join(__dirname,"../../src/target/x86_64-unknown-linux-gnu/release/bdt-tools"))){
        fs.copyFileSync(path.join(__dirname,"../../src/target/x86_64-unknown-linux-gnu/release/bdt-tools"),path.join(__dirname,"../service/cyfs_bdt/bdt-tools"))
    }
    let zip = await zipTask.startZIP("cyfs_bdt");
    let upload_zip = await request.upload(path.join(__dirname,"../service/cyfs_bdt","cyfs_bdt.zip"));
    console,info(`上传压缩包：${JSON.stringify(upload_zip)}`)
    let upload_service = await updateService(serviceid,servicename,upload_zip.url, upload_zip.md5)
    console,info(`更新服务：${JSON.stringify(upload_service)}`)
}
main().finally(()=>{
    process.exit(0);
})