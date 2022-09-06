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
            NAT: req.body.NAT,
            eps: req.body.eps ,
            agentMult: req.body.agentMult,
            agentid: req.body.agentid,
            router: req.body.report_time ,
            portMap: req.body.chunk_cache ,
            logUrl : req.body.logUrl,
        };
        let model = new BdtAgent();
        let result =await  model.add(testcaseInfo);
        return res.json(result)
    
    }
);
