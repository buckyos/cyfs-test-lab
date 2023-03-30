const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');




module.exports = (env) => {
    const jsxPlugins = [['@babel/plugin-proposal-decorators', { legacy: true }]];
    const plugins = [
        new webpack.DefinePlugin({
            process: { platform: {} }
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: '../common/**/*.js',
                    //to : path.join(__dirname, '../dist/common/')
                },
                {
                    from: '../dec-app-base/**/*.js',
                    //to : path.join(__dirname, '../dist/common/')
                },
                {
                    from: '../dec-app-base/**/*.proto',
                    //to : path.join(__dirname, '../dist/common/')
                },
                // {
                //     from : path.join(__dirname, '../dec-app-base/codec/protos/dec_objects_pb.js'),
                //     to : path.join(__dirname, './dist/dec-app-base/codec/protos/')
                // },
                // {
                //     from : path.join(__dirname, '../dec-app-base/codec/protos/dec_objects.proto'),
                //     to : path.join(__dirname, './dist/dec-app-base/codec/protos/')
                // },
            ],
            options: {
                concurrency: 100,
            },
        }),
        new HtmlWebpackPlugin({
            template: './index.html',
            favicon: path.resolve(__dirname, 'favicon.ico')
        }),
    ];
    if (!env.production) {
        jsxPlugins.unshift(require.resolve('react-refresh/babel'));
        plugins.unshift(new ReactRefreshPlugin());
    }
    //plugins.unshift(new ReactRefreshPlugin());
    return {
        entry: {
            app: './index.tsx'
        },
        output: {
            chunkFilename: (pathData) => {
                return pathData.chunk.name === 'main' ? '[name].js' : '[name]/[name].js';
            },
            path: path.join(__dirname, '../dist/web')
        },
        mode: env.production ? 'production' : 'development',
        devtool: env.production ? false : 'source-map',
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.json'],
            alias: {
                '@src': path.resolve(__dirname, '../'),
                '@www': path.resolve(__dirname, './')
            },
            fallback: {
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify')
            }
        },
        devServer: {
            static: {
                directory: path.join(__dirname, '../www')
            },
            port: 8088,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT, HEAD", 
                "Access-Control-Allow-Headers": "Content-Type, Token, adminID", 
                "Access-Control-Max-Age": "3600",
                "dec_id" : "9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd"
            },
            //watchFiles: [path.resolve(__dirname, './**')],
            compress: true,
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'esbuild-loader',
                    options: {
                        loader: 'tsx',
                        target: 'chrome80',
                        tsconfigRaw: require('../tsconfig.json')
                    }
                },
                {
                    test: /\.(css|less)$/,
                    use: [
                        {
                            loader: 'style-loader'
                        },
                        {
                            loader: 'css-loader'
                        },
                        {
                            loader: 'esbuild-loader',
                            options: {
                                loader: 'css',
                                minify: process.env.NODE_ENV === 'production' ? true : false
                            }
                        },
                        {
                            loader: 'less-loader'
                        },
                        {
                            loader: 'style-resources-loader',
                            options: {
                                patterns: path.resolve(__dirname, 'styles/common.less')
                            }
                        }
                    ]
                },
                {
                    test: /\.(jpg|png|svg|ico|icns)$/,
                    loader: 'file-loader',
                    options: {
                        name: '[path][name].[ext]'
                    }
                }
            ]
        },
        plugins: plugins,
        externals: [
            function ({ context, request }, callback) {
                //if (/cyfs-sdk-nightly$/.test(request)) {
                if (/cyfs-sdk$/.test(request)) {
                    console.log('replace', request);
                    return callback(null, 'cyfs');
                }
                callback();
            }
        ]
    };
};
