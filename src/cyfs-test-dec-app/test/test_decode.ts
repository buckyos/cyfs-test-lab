import * as cyfs from "../cyfs"

type TestParam = {
    id : cyfs.ObjectId
}

async function main() {
    let param1 : TestParam = {
        id :  cyfs.ObjectId.from_base_58("5aSixgLx9pSDX3SAYnTY2KnunaxiMP85C6DuWPEsvKck").unwrap()
    };
    console.info(`初始参数param1 ： ${param1.id} ${param1.id.obj_type_code()}  `)
    let param_str = JSON.stringify(param1);
    console.info(`字符串 param_str ： ${param_str}`)
    let param_json : TestParam = JSON.parse(param_str);
    console.info(`param_json ： ${param_json.id}  ${param_json.id}`)
    let device_id  = cyfs.DeviceId.from_base_58(param_json.id.toString()).unwrap()
    console.info(device_id)
}
main()