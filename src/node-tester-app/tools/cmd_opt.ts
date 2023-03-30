import { Command } from 'commander';
import * as action from "./action"


async function main() {
    const program = new Command('node_test');
    let result =  await program.addCommand(action.zip_case.makeCommand())
        .addCommand(action.clean.makeCommand())
        .addCommand(action.create_task.makeCommand())
        .addCommand(action.update_task.makeCommand())
        .addCommand(action.create_job.makeCommand())
        .showHelpAfterError(true)
        .parseAsync();
    process.exit(0)    
}

main();

