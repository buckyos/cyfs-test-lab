module.exports = {
    mode: "development",
    devtool: "inline-source-map",
    entry: "./testsuite/system-test/cyfs_lib/ndn/scenario_group_context/test_ndn_scenario.ts",
    resolve: {
      extensions: [".ts", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
              },
            },
          ],
        },
        {
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                ["@babel/preset-env", { targets: "last 2 versions" }],
              ],
            },
          },
        },
      ],
    },
  };