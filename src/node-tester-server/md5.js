const Crypto = require('crypto');
const fs = require('fs');

filePath = process.argv[2];
let fileContent = fs.readFileSync(filePath);
let md5 = Crypto.createHash('md5');
md5.update(fileContent);
let md5Hash = md5.digest();
console.log(md5Hash.toString('hex'));
