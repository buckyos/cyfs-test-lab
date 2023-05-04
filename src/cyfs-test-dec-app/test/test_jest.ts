import * as cyfs from "@/cyfs";

const dec_app_1 = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
describe("test suite",function(){
    test("test data1",async()=>{
        let stack  = cyfs.SharedCyfsStack.open_runtime(dec_app_1);
        await stack.wait_online()
    })
    test("test data1",async()=>{
        let stack  = cyfs.SharedCyfsStack.open_runtime(dec_app_1);
        await stack.wait_online()
    })
})