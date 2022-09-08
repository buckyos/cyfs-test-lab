import { ErrorCode, RandomGenerator, Logger, TaskClientInterface, ClientExitCode, sleep } from '../base';

async function main() {
    let test =  await RandomGenerator.string(5000)
    console.info(test)
    console.info(Buffer.byteLength(test))
    
}
main();