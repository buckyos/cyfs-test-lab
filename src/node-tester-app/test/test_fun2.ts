
import { sleep} from '../base';


class TextRun {
    private run_index : number;
    constructor(){
        this.run_index = 0;
    }
    get_stack_index(){
        this.run_index = this.run_index + 1;
        return this.run_index - 1;
    }
    async create(){
        let index = this.get_stack_index();
        await sleep(100);
        return index
    } 
}

async function main() {
    let text = new TextRun();
    let run_list = [];
    for(let i =0;i<1000;i++){
        run_list.push(new Promise(async(V)=>{
            let data  = await text.create();
            console.info(data)
        }))
    }
    for(let run of run_list){
        await run
    }
}
main()