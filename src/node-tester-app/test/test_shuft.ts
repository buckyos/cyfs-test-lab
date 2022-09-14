import {labAgent} from "../taskTools/cyfs_bdt/labAgent"

const shuffle =  function (arr:Array<any>) {
    let newArr = Array.prototype.slice.call(arr), // copy 新数组
        temp = 0
    for (let i = arr.length - 1; i > 0; i--) {
        temp = Math.floor(Math.random() * i);
        [newArr[i], newArr[temp]] = [newArr[temp], newArr[i]];
    }
    return newArr
}
function randshuffle(len:number){
    let result = [];
    for(let i = 0;i<len;i++){
        for(let j = 0;j<len;j++){
            result.push([i,j]);
        } 
    }
    result =  shuffle(result);
    return result

}

async function main() {
    console.info(labAgent.length)
    let list = randshuffle(labAgent.length);
    for(let [i,j] of list){
        console.info(i,j)
    
    }
}
main();