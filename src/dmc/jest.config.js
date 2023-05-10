const { defaults } = require('jest-config');
const path = require("path")
module.exports = {
  testTimeout: 600000,
  preset: "ts-jest",
  // 集成 bable ES6语法特性
  modulePaths: [
    '<rootDir>/'
  ],
  moduleNameMapper: {
    //'^\\.\\/cyfs\\/cyfs_node\\.d$': '<rootDir>/src/cyfs/cyfs_node.d.ts',
    '^@/(.*)$': '<rootDir>/$1',
    
  },
  preset: 'ts-jest',
  testEnvironment: 'node',
  // globals: {
  //   "ts-jest": {
  //     "diagnostics": false
  //   }
  // },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // 测试用例匹配规则限制
  testRegex:   "(/test_case/.*/.*|(\\.|/)(test_case))\\.tsx?$",
  testPathIgnorePatterns: ['.history'],
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'js', 'ts'],
  // 测试报告配置
  testRunner: 'jest-circus/runner',
  reporters: [
    'default',
    'jest-allure2-reporter',
  ],
  // 代码覆盖率检查配置
  collectCoverage: false,
  collectCoverageFrom: ['./cyfs/**/*.ts'],
  coverageDirectory: './coverage',
  globalTeardown: "./script/teardown.js",
}