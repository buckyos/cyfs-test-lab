function main() {
    let a : {test? : {abc:String}} = { test : {abc : "AAAAAAAAAA"}}
    let b = a;
    // 结构体可以用JSON.parse(JSON.stringify(a)); 类需要实现一个clone 方法，new一个新对象
    let c  =   JSON.parse(JSON.stringify(a));
    b.test!.abc = "BBBBBBBBBBBBB"
    console.info(`a = ${a.test!.abc}`)
    console.info(`b = ${b.test!.abc}`)
    c.test!.abc = "CCCCCCCCCCCC"
    console.info(`a = ${a.test!.abc}`)
    console.info(`b = ${b.test!.abc}`)
    console.info(`c = ${c.test!.abc}`)
}
main()