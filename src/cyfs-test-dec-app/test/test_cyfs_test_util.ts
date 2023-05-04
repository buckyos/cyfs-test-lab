import * as cyfs_test_util from "../cyfs-test-util"


function test_get_date(){
    console.info(cyfs_test_util.get_date());
}



function test_dir_help(){
    console.info(cyfs_test_util.DirHelper.getRootDir());
    console.info(cyfs_test_util.DirHelper.getLogDir());
    console.info(cyfs_test_util.DirHelper.getConfigDir());
}

function test_config(){
    console.info(cyfs_test_util.load_cyfs_driver_client_conf().agentServer.host)
}
function test_driver_machine_conf(){
    let config = cyfs_test_util.load_driver_machine_conf();
    console.info(JSON.stringify(config.simulator))
}

async function main() {
    // test_get_date();
    // test_dir_help();
    // test_config();
    //test_driver_machine_conf();
    let stack_manager = cyfs_test_util.StackManager.createInstance();
}
main()