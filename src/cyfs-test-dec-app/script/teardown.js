const { exec } = require("child_process");

module.exports = async () => {
  // 关闭所有子进程
  await exec("kill $(jobs -p) || true");
  process.exit(0)
};