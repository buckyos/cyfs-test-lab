//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {BDTClientModel,BDTClient} from "../../model/bdt/bdt_client"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

router.post('/add',
    async (req, res) => {
        console.info(`#receive bdt_client add request,body = ${JSON.stringify(req.body)} `)
        const testcaseInfo:BDTClientModel = {
            testcaseId : req.body.testcaseId,
            name: req.body.name,
            peerid : req.body.peerid, 
            peerInfo: req.body.peerInfo, 
            sn_resp_eps : req.body.sn_resp_eps,
        };
        let model = new BDTClient();
        let result =await  model.add(testcaseInfo);
        return res.json(result)
    
    }
);
