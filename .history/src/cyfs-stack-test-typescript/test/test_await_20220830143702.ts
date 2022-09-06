
async function test1() {
    return 1
}


async function main() {
    let check = test1();
    console.info(await check)
    console.info(await check)
}
main()