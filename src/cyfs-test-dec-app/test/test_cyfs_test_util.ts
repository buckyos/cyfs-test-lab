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


async function main() {
    test_get_date();
    test_dir_help();
    test_config();
}
main()