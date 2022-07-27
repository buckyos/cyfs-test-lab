const chalk = require('chalk');

function replLog(...args) {
    console.log(...args.map(a => chalk.gray(a)));
}

function replError(...args) {
    console.log(...args.map(a => chalk.red(a)));
}

function replWarn(...args) {
    console.log(...args.map(a => chalk.yellow(a)));
}

module.exports = {
    replError,
    replLog,
    replWarn
};