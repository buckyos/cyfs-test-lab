let run_param: string

if (run_param = "npm") {
    export  *  from '../../cyfs-sdk-nightly@test';
} else if (run_param = "source") {
    export *  from "../../cyfs-ts-sdk/";
}
else if (run_param = "ci") {
    export * as cyfs from "../../cyfs_node/";
}
