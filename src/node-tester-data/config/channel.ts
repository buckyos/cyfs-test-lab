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