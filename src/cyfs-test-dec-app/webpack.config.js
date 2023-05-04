module.exports = () => {
  // plugins: plugins,
  return {
    mode: "development",
    entry: "./src/index.ts",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: "ts-loader",
            },
            {
              loader: "babel-loader",
              options: {
                cacheDirectory: true, // 提高打包速度
              },
            },
          ],
        },
      ],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './')
      },
      extensions: [".tsx", ".ts", ".js"],
    },
  };
};
