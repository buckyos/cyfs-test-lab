import {spawn} from "child_process";
import {Command } from "commander";
import * as fs from "fs-extra";
import * as path from "path"


const date = require("silly-datetime");

const date_now = date.format(new Date(), "YYYY_MM_DD_HH_mm_ss");


async function runCommand(command:string) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, {shell: true,});
    childProcess.stdout.on('data', (data) => {
      console.log(`${data}`);
    });
    childProcess.on("error",(error)=>{
      console.error(`run ${command} error : ${error}`);
      reject(error)
    })
    childProcess.on('close', (code) => {
      console.log(`${command} run success`);
      resolve(code);
    });
  });
}

export function jest(): Command {
  return new Command("jest").description("run jest command")
    .requiredOption("-a, --allure", "allure",false) //<allure>
    .requiredOption("-i, --istanbul","istanbul",false)
    .requiredOption("-h, --httpServer","istanbul",false)
    .requiredOption("-d, --dir <dir>","jest test file","./testsuite")
    .action(async (options) => {
      await runCommand(`npm run test ${options.dir}`);
      const isGenerateAllureReport = (options.allure && options.allure !== 'false');
      const isGenerateIstanbulReport = (options.istanbul && options.istanbul !== 'false');
      const isStartHttpServer = (options.httpServer && options.httpServer !== 'false');
      if(isGenerateAllureReport){
        console.info(`Generate Allure Report...`);
        await runCommand(`istanbul report --dir ./test-report/${date_now}/coverage --report html`);
      }
      if(isGenerateIstanbulReport){
        console.info(`Generate Istanbu lReport...`);
        await runCommand(`allure generate ./allure-results -o test-report/${date_now}/allure -c`);
      }
      if(isStartHttpServer){
        console.info(`Start http server view test report...`);
        await runCommand("npm run http-server");
      }
  });
}

async function main() {
  let report_dir = path.join(__dirname,'test-report',date_now)
  fs.mkdirpSync(report_dir);


  const program = new Command("test runner");
  let result = await program.addCommand(jest()).showHelpAfterError(true).parseAsync();
  process.exit(0);
}
main();
