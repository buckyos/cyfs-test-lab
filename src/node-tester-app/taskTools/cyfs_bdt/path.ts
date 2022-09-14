


export function join(...paths: string[]): string{
    let data = "";
    let chart = "\\"
    if(paths[0].includes("/")){
        chart = "/"
    }
    for(let index of paths){
        data = data + chart + index
    }
    return data;
}
