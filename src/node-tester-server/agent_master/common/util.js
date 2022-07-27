const crypto = require('crypto');
const _ = require('lodash');

function md5(text) {
    let md5sum = crypto.createHash('md5');
    md5sum.update(Buffer.from(text));
    return md5sum.digest('hex');
}

function checkRequestBody(object, keys) {
    let isOk = false;
    let lackKeys = keys.slice(0);

    _.forEach(object, (value, key) => {
        if ( keys.includes(key) ) {
            if ( value != undefined && value != null && value !== '' ) {
                lackKeys = _.without(lackKeys, key);
            }
        }
    });

    if ( lackKeys.length === 0 ) {
        isOk = true;
    }

    return {isOk, lackKeys};
}

module.exports = {
    md5,
    checkRequestBody,
};
