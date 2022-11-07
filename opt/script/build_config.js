const only_ood = ["x86_64-pc-windows-msvc", "x86_64-unknown-linux-gnu", 'aarch64-unknown-linux-gnu']
const formal_platform = ["x86_64-pc-windows-msvc", "x86_64-unknown-linux-gnu"]


const tools = [
    {
        "name": "bdt-tools",
        "include": formal_platform
    }
]

const service = {
    cyfs_bdt : {
        serviceid:4, 
        servicename:"cyfs_bdt" 
    },
    cyfs_bdt_nightly: {
        serviceid:349, 
        servicename:"cyfs_bdt_nightly" 
    },
    cyfs_bdt_beta: {
        serviceid:350, 
        servicename:"cyfs_bdt_beta" 
    },
}



module.exports = {
    tools,
    service
}