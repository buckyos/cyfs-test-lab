
import {sleep } from '../base';

class A {
    private a :string
    constructor(a:string){
        this.a = a;
    }
    async  testA() {
        console.info("222222")
        await sleep(5000);
        console.info(this.a);
    }
}


async function main() {  
    let run = new A("dssss");
    let test = function(){
        
        run.testA();
    }
    test();
    await sleep(10000);
}
main().finally(async()=>{
    process.exit(0)
})