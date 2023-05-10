

# cyfs-test-framework
 
Typescript： 

+ Jest(单元测试) 
+ Webpack(打包) 
+ Babel(转码器)
+ ESLint(代码规范)
+ Puppeteer(浏览器运行容器) 
+ istanbul(代码覆盖率)
+ Allure(测试报告)# cyfs-test-framework
 
Typescript： 

+ Jest(单元测试) 
+ Webpack(打包) 
+ Babel(转码器)
+ ESLint(代码规范)
+ Puppeteer(浏览器运行容器) 
+ istanbul(代码覆盖率)
+ Allure(测试报告)

## 初始化方式
```
npm i 
```

## 运行用例
```
cd dmc
npm run test test_case/dmc_user/test_lite_client.ts
```

## 生成测试报告
```
npm run allure-generate
http://127.0.0.1:8080
```

## 配置文件

+ .nycrc.json ： istanbuljs 代码覆盖率统计
+ jest.config.js ：jest 单元测试框架集成配置
+ eslintrc.js ：ESLint 代码规范检查配置
+ tsconfig.json ：ts 编译配置
+ package.json ：依赖包和运行脚本命令