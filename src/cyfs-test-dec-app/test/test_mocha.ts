

describe("Set Title1",function(){
   
    beforeEach ( async function (){
        //console.info(`beforeEach: ${this.currentTest!.title}`)
    })
    describe("Get Title2",async function(){
        it("Get Title3",async function (){
            console.info(`it:}`)
        })
        it("Get Title4",async function (){
            // for(let suit_info of this.suites){
            //     console.info("suite:",suit_info)
            // }
            // for(let suit_info of this.tests){
            //     console.info("test:",suit_info)
            // }
            //console.info(`it: ${this.title}`)
        })
    })
    describe("Set Title2",async function(){
        it("Set Title3",async function(){
            //console.info(`it: ${this.title}`)
        })
        it("Set Title4",async function (){
            // for(let suit_info of this.suites){
            //     console.info("suite:",suit_info)
            // }
            // for(let suit_info of this.tests){
            //     console.info("test:",suit_info)
            // }
            //console.info(this.suites[0].tests)
        })
    })
    
})