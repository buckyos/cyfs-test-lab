

import path from "path";
// https://oapi.dingtalk.com/robot/send?access_token=d499788f5e2c48f2ed02a3602ce17914ffba027ad7321b55cbd210440d16d79f
// SECf6a4c977d1a3f1758a7ca251967025242e72727be8ebd45966f401f21c76adf4
export const dingdingConfig_test = {
    NFT :{
        dingdingUrl : "https://oapi.dingtalk.com/robot/send?access_token=d499788f5e2c48f2ed02a3602ce17914ffba027ad7321b55cbd210440d16d79f",
        secret : "SECf6a4c977d1a3f1758a7ca251967025242e72727be8ebd45966f401f21c76adf4",
        msg:{
            msgtype:"text",
            at: {
                "atMobiles":[],
                "atUserIds":[],
                "isAtAll": false
            },
        }
        
    }
}
export const dingdingConfig_formal = {
    NFT :{
        dingdingUrl : "https://oapi.dingtalk.com/robot/send?access_token=bab8895d0c5ecc9b8c983f8ef30d9a346f51a99d778c6e8ca86d8269c0c52c5a",
        secret : "SEC7e8fa3ce29b2d6c45627396af811203bf3a74b3e9abfc055adac93846893f070",
        msg:{
            msgtype:"text",
            at: {
                "atMobiles":[],
                "atUserIds":[],
                "isAtAll": false
            },
        }
        
    }
}

export const dingdingConfig = dingdingConfig_test;

export const dec_id = "9tGpLNnab9uVtjeaK4bM59QKSkLEGWow1pJq6hjjK9MM";

export const nft_tool_path = path.join("C:\\Users\\bucky\\AppData\\Roaming\\CYFS_Browser\\CYFS_Browser\\nft-creator.exe");