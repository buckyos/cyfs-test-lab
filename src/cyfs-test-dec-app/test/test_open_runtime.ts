
import * as cyfs from "../cyfs"
// nightly 用来测试的两个dec_app
export const NIGHTLY_CYFS_TEST_DEC_APP = "9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd"
export const NIGHTLY_DEC_APP_SERVICE = "9tGpLNnUxFFXh3XxzZrJJ6UuekyzF7LJ7t7ZTtJjsPMH"

// beta 用来测试的两个dec_app

export const BETA_CYFS_TEST_DEC_APP = "9tGpLNni9AYycMDC9LrAAKoPqQc7VQSnodotFWXuh5D1"
export const BETA_DEC_APP_SERVICE = "9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd"



export let DEC_APP = NIGHTLY_CYFS_TEST_DEC_APP;

async function main() {
    let stack = cyfs.SharedCyfsStack.open_runtime(cyfs.ObjectId.from_base_58(DEC_APP).unwrap());
    let run =await stack.wait_online();

}
main();