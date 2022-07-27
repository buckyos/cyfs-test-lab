//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {NftInfo,RecordNFT} from "../../model/nft/nft_info"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

router.post('/recordNft',
    async (req, res) => {
        console.info(`#receive nft_info recordNft request,body = ${JSON.stringify(req.body)} `)
        if(!req.body.name || !req.body.name ){
            return res.json({err:404,msg:"缺少参数"})
        }
        const testcaseInfo:RecordNFT = {
            name:req.body.name,
            author_id:req.body.author_id,
            owner_id:req.body.owner_id,
            nft_id:req.body.nft_id,
            status:req.body.status,
            cyfs_link:req.body.cyfs_link,
            nft_link:req.body.nft_link,
            data:req.body.data,
        };
        let result =await NftInfo.recordNft(testcaseInfo);
        return res.json(result)
    
    }
);

router.post('/querySelling',
    async (req, res) => {
        console.info(`#receive nft_info querySelling request,body = ${JSON.stringify(req.body)} `)
        if( !req.body.author_id || !req.body.status){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let result =await NftInfo.querySelling(req.body.author_id,req.body.status);
        return res.json(result)
    
    }
);

router.post('/buyNft',
    async (req, res) => {
        console.info(`#receive nft_info buyNft request,body = ${JSON.stringify(req.body)} `)
        if( !req.body.author_id || !req.body.status || !req.body.nft_id ){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let result =await NftInfo.buyNft(req.body.nft_id,req.body.author_id,req.body.status);
        return res.json(result)
    
    }
);
router.post('/report',
    async (req, res) => {
        console.info(`#receive nft_info report request,body = ${JSON.stringify(req.body)} `)
        if( !req.body.testcase_date){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let result =await NftInfo.report(req.body.testcase_date);
        return res.json(result)
    }
);