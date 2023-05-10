import {DMCProxyDriver,DMCClientConfig} from "@/dmc-driver";
import path from "path";
var date = require("silly-datetime");
import assert from "assert"
import { sleep } from "cyfs-sdk";

const agent_list : Array<DMCClientConfig> = [{
    peer_name : "linux_server",
    os : "linux"
}]

const date_now = date.format(new Date(),'YYYY-MM-DD-HH-mm-ss');
const log_path = path.join(__dirname,"../../blog",date_now)
const cyfs = require("cyfs-sdk")
cyfs.clog.enable_file_log({
  name: "dmc-user-lite",
  dir: log_path,
  file_max_size: 1024 * 1024 * 10,
  file_max_count: 10,
});
const driver = new DMCProxyDriver(log_path)

const miner_id1 =  256;

describe("Testcase: dmc-user-lite tool ",()=>{
    beforeAll(async()=>{
        return new Promise(async(resolve)=>{
            console.info(`######## beforeAll`)
            await driver.init();
            await driver.start();
            await driver.load_config(agent_list); 
            let client = driver.get_client("linux_server").client!;
            await client.start_server();
            await sleep(5000)
            console.info(`######## beforeAll`)
            resolve("success")
        })
    })
    afterAll(async()=>{
        return new Promise(async(resolve)=>{
            console.info(`######## afterAll`)
            await driver.stop();
            await sleep(5000)
            resolve("success")
        })
    })
    describe("Testcase for tool command params",()=>{

        describe("Command: dmc-user-lite-server",()=>{
            test("Linux start dmc-user-lite-server",async()=>{
                let client = driver.get_client("linux_server").client!;
                let result = await client.start_server();
            })
        })
        describe("Command: ./dmc-user-lite-client --help",()=>{
            /**      
            Usage: dmc-user-lite-client [OPTIONS] <COMMAND>
            Commands:
                register  Register source path to backup
                backup    Backup source to DMC network
                watch     Watch backup progress
                restore   Restore from DMC network
                list      List all backup progress
                random    
                help      Print this message or the help of the given subcommand(s)
            Options:
                -c, --config <CONFIG>  Config file path
                -h, --help             Print help
            */
            test("Linux run command: dmc-user-lite-client --help",async()=>{
                let client = driver.get_client("linux_server").client!;
                let result = await client.excute_cmd("--help");
                assert.equal(result.code,0);
                assert.equal(result.print_data,"Usage: dmc-user-lite-client [OPTIONS] <COMMAND>\n\nCommands:\n  register  Register source path to backup\n  backup    Backup source to DMC network\n  watch     Watch backup progress\n  restore   Restore from DMC network\n  list      List all backup progress\n  random    \n  help      Print this message or the help of the given subcommand(s)\n\nOptions:\n  -c, --config <CONFIG>  Config file path\n  -h, --help             Print help\n");
            })
            
        })
        describe("Command: ./dmc-user-lite-client register",()=>{
            /**
            Register source path to backup
            Usage: dmc-user-lite-client register [OPTIONS] --file <FILE>
            Options:
                -f, --file <FILE>
                        Local file path
                    --merkle-piece-size <MERKLE_PIECE_SIZE>
                        Merkle leaf size of leaves for on-chain challenge [default: 1024]
                    --stub-count <STUB_COUNT>
                        Stub counts to save for off-chain challenge [default: 100]
                    --stub-size <STUB_SIZE>
                        Stub length to save for off-chain challenge [default: 16]
                -h, --help
                        Print help

             */
            test("Linux run command: ./dmc-user-lite-client register --help",async()=>{
                let client = driver.get_client("linux_server").client!;
                let result = await client.excute_cmd("register --help");
                assert.equal(result.code,0);
                assert.equal(result.print_data,"Register source path to backup\n\nUsage: dmc-user-lite-client register [OPTIONS] --file <FILE>\n\nOptions:\n  -f, --file <FILE>\n          Local file path\n      --merkle-piece-size <MERKLE_PIECE_SIZE>\n          Merkle leaf size of leaves for on-chain challenge [default: 1024]\n      --stub-count <STUB_COUNT>\n          Stub counts to save for off-chain challenge [default: 100]\n      --stub-size <STUB_SIZE>\n          Stub length to save for off-chain challenge [default: 16]\n  -h, --help\n          Print help\n");
            })
        })
        describe("Command: ./dmc-user-lite-client backup",()=>{
            /**
            Backup source to DMC network

            Usage: dmc-user-lite-client backup [OPTIONS] --source-id <SOURCE_ID> --duration <DURATION>
            Options:
                    --source-id <SOURCE_ID>              Source id returned from register command
                -d, --duration <DURATION>                Backup duration in weeks
                    --miner <MINER>                      Order this miner's bill
                    --min-asset <MIN_ASSET>              Order bill at least asset space
                    --max-price <MAX_PRICE>              Order bill has max price
                    --min-pledge-rate <MIN_PLEDGE_RATE>  Order bill has min pledge rate
                -w, --watch                              Continue watch backup progress
                -h, --help  
             */
            test("Linux run command: ./dmc-user-lite-client backup --help",async()=>{
                let client = driver.get_client("linux_server").client!;
                let result = await client.excute_cmd("backup --help");
                assert.equal(result.code,0);
                assert.equal(result.print_data,"Backup source to DMC network\n\nUsage: dmc-user-lite-client backup [OPTIONS] --source-id <SOURCE_ID> --duration <DURATION>\n\nOptions:\n      --source-id <SOURCE_ID>              Source id returned from register command\n  -d, --duration <DURATION>                Backup duration in weeks\n      --miner <MINER>                      Order this miner's bill\n      --min-asset <MIN_ASSET>              Order bill at least asset space\n      --max-price <MAX_PRICE>              Order bill has max price\n      --min-pledge-rate <MIN_PLEDGE_RATE>  Order bill has min pledge rate\n  -w, --watch                              Continue watch backup progress\n  -h, --help                               Print help\n");
            })
        })
        describe("Command: ./dmc-user-lite-client watch",()=>{
            /**
            Watch backup progress

            Usage: dmc-user-lite-client watch --sector-id <SECTOR_ID>

            Options:
                --sector-id <SECTOR_ID>  sector id returned from backup command
                -h, --help                   Print help

             */
            test("Linux run command: ./dmc-user-lite-client watch --help",async()=>{
                let client = driver.get_client("linux_server").client!;
                let result = await client.excute_cmd("watch --help");
                assert.equal(result.code,0);
                assert.equal(result.print_data,"Watch backup progress\n\nUsage: dmc-user-lite-client watch --sector-id <SECTOR_ID>\n\nOptions:\n      --sector-id <SECTOR_ID>  sector id returned from backup command\n  -h, --help                   Print help\n");
            })
        })
        describe("Command: ./dmc-user-lite-client restore",()=>{
            /**
            Restore from DMC network

            Usage: dmc-user-lite-client restore --sector-id <SECTOR_ID> --path <PATH>

            Options:
                --sector-id <SECTOR_ID>  sector id returned from backup command
                -p, --path <PATH>            restore file to path
                -h, --help                   Print help

             */
            test("Linux run command: ./dmc-user-lite-client restore --help",async()=>{
                let client = driver.get_client("linux_server").client!;
                let result = await client.excute_cmd("restore --help");
                assert.equal(result.code,0);
                assert.equal(result.print_data,"Restore from DMC network\n\nUsage: dmc-user-lite-client restore --sector-id <SECTOR_ID> --path <PATH>\n\nOptions:\n      --sector-id <SECTOR_ID>  sector id returned from backup command\n  -p, --path <PATH>            restore file to path\n  -h, --help                   Print help\n");
            })
        })
        describe("Command: ./dmc-user-lite-client list",()=>{
            /**
            List all backup progress

            Usage: dmc-user-lite-client list [OPTIONS]

            Options:
                --page-index <PAGE_INDEX>  Page index [default: 0]
                --page-size <PAGE_SIZE>    Page size [default: 10]
            -h, --help                     Print help
             */
            test("Linux run command: ./dmc-user-lite-client list --help",async()=>{
                let client = driver.get_client("linux_server").client!;
                let result = await client.excute_cmd("list --help");
                assert.equal(result.code,0);
                assert.equal(result.print_data,"List all backup progress\n\nUsage: dmc-user-lite-client list [OPTIONS]\n\nOptions:\n      --page-index <PAGE_INDEX>  Page index [default: 0]\n      --page-size <PAGE_SIZE>    Page size [default: 10]\n  -h, --help                     Print help\n");
            })
        })
    })
    describe("Testcase for backup/restore file",()=>{
        describe("Linux OS: backup/restore process use case with must input params,path type = file",()=>{
            let client = driver.get_client("linux_server").client!;
            
            test("Linux OS: backup/restore process use case with must input params ,file_size = 100MB",async()=>{
                // get test client
                let client = driver.get_client("linux_server").client!;
                //step1 : Create a random file 100MB
                const file_info = await client.get_util_tool().create_file(100*1024*1024)
                assert.equal(file_info.err,0,file_info.log);
                //step2 : Register source file into zip file ready to backup
                let result = await client.excute_cmd(`register -f ${file_info.file_path}`);
                assert.equal(result.code,0,result.print_data);
                let source_id = result.print_data.split("source_id is ")[1].split("\n")[0]
                console.info(`Register source file success , source_id = ${source_id}`)
                //step3 : Backup zip to DMC network
                result = await client.excute_cmd(`backup --source-id ${source_id} --duration 24`);
                assert.equal(result.code,0,result.print_data);
                let sector_id = result.print_data.split("backup started, sector_id=")[1].split("\n")[0];
                console.info(`Backup source success , sector_id = ${sector_id}`)
                // step4 : Watch backup progress wait finished 
                let check_sum = 20;
                while (check_sum--) {
                    result = await client.excute_cmd(`watch --sector-id ${sector_id}`,30*1000);
                    assert.equal(result.code,0,result.print_data);
                    if(result.print_data.includes("source has backup to miner")){
                        break;
                    }
                }
                assert.ok(check_sum>0,`watch ${sector_id} not backup finished`)
                //step5 : Restore data from DMC network,and save data to local path
                let restore_path = (await client.get_util_tool().get_cache_path()).cache_path!.file_download
                result = await client.excute_cmd(`restore --sector-id ${sector_id} --path ${restore_path}`,300*1000);
                assert.equal(result.code,0,result.print_data);
                //step6 : List all backup progress,And check it
                result = await client.excute_cmd(`list`,30*1000);
                assert.equal(result.code,0,result.print_data);
            })
        })
        describe("backup/restore process use case with must all params,path type = dir",()=>{
            let client = driver.get_client("linux_server").client!;
            
            test("Linux OS: backup/restore process use case with all input params , Dir = dir_number1*dir_depth1*10file*10MBsize",async()=>{
                // get test client
                let client = driver.get_client("linux_server").client!;
                //step1 : Create a random file 100MB
                const file_info = await client.get_util_tool().create_dir(10,10*1024*1024,1,1)
                assert.equal(file_info.err,0,file_info.log);
                //step2 : Register source file into zip file ready to backup
                let result = await client.excute_cmd(`register -f ${file_info.dir_path} --merkle-piece-size 1024 --stub-count 100 --stub-size 16`);
                assert.equal(result.code,0,result.print_data);
                let source_id = result.print_data.split("source_id is ")[1].split("\n")[0]
                console.info(`Register source file success , source_id = ${source_id}`)
                //step3 : Backup zip to DMC network
      
                // result = await client.excute_cmd(`backup --source-id ${source_id} --duration 24 --miner ${miner_id1} --min-asset 0 --max-price 99999 --min-pledge-rate 0 `);
                result = await client.excute_cmd(`backup --source-id ${source_id} --duration 24`);
                assert.equal(result.code,0,result.print_data);
                let sector_id = result.print_data.split("backup started, sector_id=")[1].split("\n")[0];
                console.info(`Backup source success , sector_id = ${sector_id}`)
                // step4 : Watch backup progress wait finished 
                let check_sum = 20;
                while (check_sum--) {
                    result = await client.excute_cmd(`watch --sector-id ${sector_id}`,30*1000);
                    assert.equal(result.code,0,result.print_data);
                    if(result.print_data.includes("source has backup to miner")){
                        break;
                    }
                }
                assert.ok(check_sum>0,`watch ${sector_id} not backup finished`)
                //step5 : Restore data from DMC network,and save data to local path
                let restore_path = (await client.get_util_tool().get_cache_path()).cache_path!.file_download
                result = await client.excute_cmd(`restore --sector-id ${sector_id} --path ${restore_path}/${file_info.dir_name}`,300*1000);
                assert.equal(result.code,0,result.print_data);
                //step6 : List all backup progress,And check it
                result = await client.excute_cmd(`list --page-index 0 --page-size 10`,30*1000);
                assert.equal(result.code,0,result.print_data);
            })
        })
    })
    
})