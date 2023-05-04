const { defaults } = require('jest-config');
const date = require("silly-datetime");

const cyfs = require("cyfs-sdk-nightly")
const path = require("path")

const date_now = date.format(new Date(),'YYYY-MM-DD-HH-mm-ss');
cyfs.clog.enable_file_log({
  name: "cyfs_stack",
  dir: path.join(__dirname,"blog",date_now),
  file_max_size: 1024 * 1024 * 10,
  file_max_count: 10,
});

module.exports = {
  testTimeout: 600000,
  preset: "ts-jest",
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
  testRegex:   "(/testsuite/.*/.*|(\\.|/)(testsuite))\\.tsx?$",
  testPathIgnorePatterns: ['.history'],
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'js', 'ts'],
  testRunner: 'jest-circus/runner',
  reporters: [
    'default',
    'jest-allure2-reporter',
  ],
  collectCoverage: true,
  collectCoverageFrom: ['./cyfs/**/*.ts', './cyfs/**/*.d.ts'],
  coverageDirectory: './coverage',
  globalTeardown: "./script/teardown.js",
}