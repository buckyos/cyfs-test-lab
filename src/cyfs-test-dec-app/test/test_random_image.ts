import {RandomGenerator} from "../common"



async function main() {
    for(let i = 0;i<200;i++){
        let image = await RandomGenerator.create_random_img("E:\\bucky_file\\OneDrive - buckyos\\QA管理\\项目测试管理\\项目测试\\基础架构\\测试环境\\dec_app_nightly\\dec_app_web_perf\\www\\img_small",`img_${i}.jpg`)
    }
    
}
main();