import {BufferGenerator,StringGenerator,NumberGenerator} from "../cyfs-test-util/random"

async function main() {
    // console.info(StringGenerator.generate_string(1000).length)
    // console.info(NumberGenerator.generate_int(10,100))
    // console.info(NumberGenerator.generate_float(10,100,5))
    // await BufferGenerator.init();
    // await BufferGenerator.refresh_10mb();
    let run_list = []
    for(let i=0;i<100;i++){
        run_list.push(new Promise(async(V)=>{
            let rand_data = await BufferGenerator.generate_buffer(200*1024*1024);
            console.info(`${rand_data.size} ${ await BufferGenerator.md5_buffer(rand_data.buffer)}`)
            V("")
        }))
    }
    for(let run of run_list){
        await run
    }
    // let buffer = await BufferGenerator.generate_buffer(20*1024*1024);
    // console.info(buffer)
}

main();