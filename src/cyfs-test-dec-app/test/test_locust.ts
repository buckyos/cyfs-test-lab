//import locust from "node-locust"

import * as cyfs from "../cyfs"

async function main() {
    let test =  cyfs.ObjectId.from_base_58("7C8ZgWeExeLY9n5GTxZ13HGDZ23V1FFUYKCBhfa2rd2u").unwrap()
    //console.info(test.to_base_36())
    console.info(cyfs.ObjectId.from_base_36("7kg2ajq9ax4ood1zip0ij2dttbyvkeq5apq4hfb80edkf619ge").unwrap().to_base_58())
}
main()