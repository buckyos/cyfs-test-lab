import assert = require('assert');
import * as cyfs from '../../../../cyfs'
import {request,ContentType} from "./request"


//Interface
//Test scenario
//System testing
//Performance testing
//Stress testing
//Smoke testing
//Regression testing

//  npx mocha .\test*.ts --reporter mochawesome --require ts-node/register
//  npx mocha .\test_service_status_nginx.ts --reporter mochawesome --require ts-node/register

describe("ood-daemon 本地1330服务测试", function () {
    this.timeout(0);
    describe("GET 获取OOD service 和 app-manager 数据",async()=>{
        it("get_status",async()=>{
            let get_data = await request("http://192.168.100.205:11330","GET","service_status");
            console.info(`${JSON.stringify(get_data)}`)
        })
        it.only("update status",async()=>{
            let update = await request("http://192.168.100.205:11330","POST","service_status/9tGpLNnWHEvsnfTLErsuZVPYhnS6mZYfzStZx3VE4N4u",JSON.stringify({
                name : "9tGpLNnWHEvsnfTLErsuZVPYhnS6mZYfzStZx3VE4N4u",
            }),ContentType.raw);
            console.info(`update resp = ${JSON.stringify(update)}`)
        })        
    })
})