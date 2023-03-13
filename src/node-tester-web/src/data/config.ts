// 默认使用nightly
let CYFS_CHANNEL = 'nightly';

console.log(`process.env.CYFS_NODE_ENV = `,process.env.CYFS_NODE_ENV)
if(process.env.CYFS_NODE_ENV == "beta"){
    CYFS_CHANNEL = 'beta'
}else{
    CYFS_CHANNEL = 'nightly'
}
export function get_channel(){
    return CYFS_CHANNEL;
}

export const ConfigInfoTest =  {
    apiServer : 'http://192.168.100.205:11081',
    dataServer : 'http://192.168.100.205:5000',
    uploadServer : 'http://192.168.100.205:11000/uploadFile/',
}
export const ConfigInfoPub = {
    apiServer : 'http://bdttest.tinyappcloud.com:11081',
    dataServer : 'http://bdttest.tinyappcloud.com:5000',
    uploadServer : 'http://bdttest.tinyappcloud.com:11000/uploadFile/',
}
export function get_config() {
    if(get_channel()=="beta"){
        return ConfigInfoPub
    }else{
        return ConfigInfoTest
    }
};
export const ConfigInfo = get_config()