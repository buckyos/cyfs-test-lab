import * as perf from "systeminformation";
import {ErrorCode, Logger, BufferReader, sleep,RandomGenerator} from '../../base';
import {request,ContentType} from "./request";
// 指定进程名性能
export async function get_process(name:string): Promise<{cpu:number,mem:number,process:Array<perf.Systeminformation.ProcessesProcessData>}>{
    console.info("#### get_process")
    return new Promise(async(V)=>{
        perf.processes(async(data)=>{
            let cpu = 0;
            let mem = 0;
            let process = []
            for(let i in data.list){
                console.info(data.list[i])
                cpu = cpu + data.list[i].cpu
                mem = mem + data.list[i].mem
                if(data.list[i].name == name){
                    process.push(data.list[i])
                }
            }
            V({cpu,mem,process})
            
        })
    })
}
//cpu
export async function get_cpu(): Promise<perf.Systeminformation.CpuCurrentSpeedData|string>{
    console.info("#### get_cpu")
    return new Promise(async(V)=>{
        setTimeout(()=>{
            V("get Systeminformation failed")
        },5000)
        perf.cpuCurrentSpeed(async(data)=>{
            console.info(`#### get_cpu : ${JSON.stringify(data)}`)
            V(data)
        })
    })
}
//内存
export async function get_mem(): Promise<perf.Systeminformation.MemData|string>{
    console.info("#### get_mem")
    return new Promise(async(V)=>{
        setTimeout(()=>{
            V("get Systeminformation failed")
        },5000)
        perf.mem(async(data)=>{
            console.info(`#### get_mem : ${JSON.stringify(data)}`)
            V(data)
        })
    })
}
//磁盘 IO
export async function get_disk_io(): Promise<perf.Systeminformation.DisksIoData |string>{
    console.info("#### get_disk_io")
    return new Promise(async(V)=>{
        setTimeout(()=>{
            V("get Systeminformation failed")
        },5000)
        perf.disksIO(async(data)=>{
            console.info(`#### get_disk_io : ${JSON.stringify(data)}`)
            V(data)
        })
    })
}
//磁盘空间
export async function get_disk(): Promise<perf.Systeminformation.DiskLayoutData[]|string>{
    console.info("#### get_disk")
    return new Promise(async(V)=>{
        setTimeout(()=>{
            V("get Systeminformation failed")
        },5000)
        perf.diskLayout(async(data)=>{
            console.info(`#### get_disk : ${JSON.stringify(data)}`)
            V(data)
        })
    })
}
//网络信息
export async function get_net_info(): Promise<perf.Systeminformation.NetworkInterfacesData[]|string>{
    console.info("#### get_net_info")
    return new Promise(async(V)=>{
        setTimeout(()=>{
            V("get Systeminformation failed")
        },5000)
        perf.networkInterfaces(async(data)=>{
            console.info(`#### get_net_info : ${JSON.stringify(data)}`)
            V(data)
        })
    })
}
//网络速度
export async function get_net_stats(ifaces?:string): Promise<perf.Systeminformation.NetworkStatsData[]|string>{
    console.info("#### get_net_stats")
    return new Promise(async(V)=>{
        setTimeout(()=>{
            V("get Systeminformation failed")
        },5000)
        perf.networkStats(ifaces,async(data)=>{
            console.info(`#### get_net_stats : ${JSON.stringify(data)}`)
            V(data)
        })
    })
}

//监听需要的性能
export async function get_agent_static(){
    let net = await get_net_info();
    let disk = await get_disk();

    return{
        net,
        disk,
    }
}
export async function get_agent_perf(name:string,process_name?:string){
    let cpu = await get_cpu();
    let mem = await get_mem();
    let disk_io =  await get_disk_io();
    let net_stats = await get_net_stats();
    let net_info = await get_net_info();
    let disk = await get_disk();
    let process;
    if(process_name){
        process = await get_process(process_name)
    }
    return{
        name,
        net_info:JSON.stringify(net_info),
        disk:JSON.stringify(disk),
        cpu:JSON.stringify(cpu),
        mem:JSON.stringify(mem),
        disk_io:JSON.stringify(disk_io),
        net_stats:JSON.stringify(net_stats),
        process:JSON.stringify(process),
    }
}


let Is_Perf = false;
export async function report_perf(agent:string,process?:string,timeout:number =5000){
    Is_Perf = true;
    while(Is_Perf){
        console.info(`#### check`)
        let perf = await get_agent_perf(agent,process);
        let result =  await request("POST","api/base/perf/report",JSON.stringify(perf),ContentType.json);
        console.info(JSON.stringify(result))
        await sleep(timeout);
    }
    return;
}
export async function stop_perf(){
    Is_Perf = false;
    return;
}

async function main() {
    let run = report_perf("lizhihong")
    await sleep(100000)
    let stop =await stop_perf();
    await run;

}
main();


