import * as cyfs from "../cyfs";

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
async function run(){
    let stack  = cyfs.SharedCyfsStack.open_runtime(dec_app_1);
    await stack.wait_online()
    console.info("test");
}
run();