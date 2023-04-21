const webpack = require("webpack");
const webpackConfig = require("./webpack.config.js");
const Mocha = require("mocha");
const path = require("path");

// 用 Webpack 打包测试代码
const compiler = webpack(webpackConfig);

// 创建 Mocha 实例
const mocha = new Mocha();

// 将编译后的代码添加到 Mocha 中
compiler.run((err, stats) => {
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    return;
  }

  // 将编译后的代码添加到 Mocha 中
  const files = stats.compilation.fileDependencies;
  files.forEach((file) => mocha.addFile(path.resolve(__dirname, file)));

  // 运行测试
  mocha.run((failures) => {
    process.exitCode = failures ? 1 : 0;
  });
});

