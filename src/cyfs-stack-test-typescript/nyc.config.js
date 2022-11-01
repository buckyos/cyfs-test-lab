const { dir } = require("console")
const { skip } = require("mocha-typescript")

module.exports = {
    all:false, //是否测试所有文件
    reporter:["html","text"],
    "report-dir":"output\\coverage",  //报告输出位置
    extension: ['.ts','.js','.d.ts'],  //除了js之外还应该处理的扩展名列表。比如.ts之类的
    require:[], //编译配置
    sourceMap: false, //代码映射默认开启
    exclude: ["TestSuite/*","common/*/*","config/*"], //需要排除的文件列表
    include: ["cyfs_node/cyfs_node.js"], //需要包含的文件列表
    "skip-full":false, //是否显示具有 100% 语句、分支和函数覆盖率的文件
    "watermarks": {
        "lines": [80, 95],
        "functions": [80, 95],
        "branches": [80, 95],
        "statements": [80, 95]
      }
}