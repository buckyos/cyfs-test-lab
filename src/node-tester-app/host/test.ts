
import * as fs from "fs-extra";
import * as path from 'path';
async function main() {
    let task_path = path.join(__dirname,"../tasks")
    let dir_list = fs.readdirSync(task_path);
    console.info(JSON.stringify(dir_list))
}
main()